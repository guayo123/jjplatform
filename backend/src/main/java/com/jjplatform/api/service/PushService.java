package com.jjplatform.api.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import com.jjplatform.api.model.DeviceToken;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Sends FCM push notifications to the devices of an academy (e.g. "duel confirmed", "victory").
 * Every method degrades to a no-op when Firebase isn't configured, so the rest of the app is
 * unaffected. The actual network send runs off the request thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushService {

    /** FCM caps a multicast at 500 tokens per call. */
    private static final int FCM_MULTICAST_LIMIT = 500;

    private final DeviceTokenRepository tokenRepository;

    /** Upsert a device token for the student (re-registering the same token refreshes its owner). */
    @Transactional
    public void registerToken(Student student, String token, String platform) {
        if (token == null || token.isBlank()) return;
        DeviceToken dt = tokenRepository.findByToken(token).orElseGet(DeviceToken::new);
        dt.setStudent(student);
        dt.setToken(token);
        dt.setPlatform(platform);
        tokenRepository.save(dt);
    }

    @Transactional
    public void removeToken(String token) {
        if (token == null || token.isBlank()) return;
        tokenRepository.deleteByToken(token);
    }

    /**
     * Broadcast a push to every device in the academy except the acting student's own devices.
     * Resolves tokens within the caller's transaction, then fires the FCM call asynchronously.
     */
    @Transactional(readOnly = true)
    public void sendToAcademy(Long academyId, String title, String body, Long exceptStudentId) {
        sendToAcademy(academyId, title, body,
                exceptStudentId == null ? List.of() : List.of(exceptStudentId));
    }

    /** Same as above but excludes several students (e.g. the duel's people already pushed directly). */
    @Transactional(readOnly = true)
    public void sendToAcademy(Long academyId, String title, String body, Collection<Long> exceptStudentIds) {
        if (academyId == null || FirebaseApp.getApps().isEmpty()) return; // push disabled / no academy
        List<String> tokens = new ArrayList<>();
        for (DeviceToken dt : tokenRepository.findByAcademyId(academyId)) {
            if (exceptStudentIds != null && exceptStudentIds.contains(dt.getStudent().getId())) continue;
            tokens.add(dt.getToken());
        }
        if (tokens.isEmpty()) return;
        CompletableFuture.runAsync(() -> dispatch(tokens, title, body));
    }

    /**
     * Send a push to the devices of specific students (e.g. the opponent + referee when a duel
     * is created). No-op when push is off or none of them have a registered device.
     */
    @Transactional(readOnly = true)
    public void sendToStudents(Collection<Long> studentIds, String title, String body) {
        if (studentIds == null || studentIds.isEmpty() || FirebaseApp.getApps().isEmpty()) return;
        List<String> tokens = new ArrayList<>();
        for (DeviceToken dt : tokenRepository.findByStudentIdIn(studentIds)) {
            tokens.add(dt.getToken());
        }
        if (tokens.isEmpty()) return;
        CompletableFuture.runAsync(() -> dispatch(tokens, title, body));
    }

    /**
     * Admin broadcast: send a free message to every device of an academy, or to ALL academies
     * when {@code academyId} is null. Returns how many devices were targeted (0 if push is off
     * or there are no registered devices).
     */
    @Transactional(readOnly = true)
    public int broadcast(Long academyId, String title, String body) {
        if (FirebaseApp.getApps().isEmpty()) return 0;
        List<DeviceToken> devices = academyId == null
                ? tokenRepository.findAll()
                : tokenRepository.findByAcademyId(academyId);
        List<String> tokens = new ArrayList<>();
        for (DeviceToken dt : devices) tokens.add(dt.getToken());
        if (tokens.isEmpty()) return 0;
        CompletableFuture.runAsync(() -> dispatch(tokens, title, body));
        return tokens.size();
    }

    private void dispatch(List<String> tokens, String title, String body) {
        try {
            Notification notification = Notification.builder().setTitle(title).setBody(body).build();
            List<String> invalid = new ArrayList<>();
            for (int i = 0; i < tokens.size(); i += FCM_MULTICAST_LIMIT) {
                List<String> chunk = tokens.subList(i, Math.min(i + FCM_MULTICAST_LIMIT, tokens.size()));
                MulticastMessage message = MulticastMessage.builder()
                        .setNotification(notification)
                        .addAllTokens(chunk)
                        .build();
                BatchResponse resp = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                List<SendResponse> responses = resp.getResponses();
                for (int j = 0; j < responses.size(); j++) {
                    SendResponse r = responses.get(j);
                    if (r.isSuccessful()) continue;
                    MessagingErrorCode code = r.getException() != null ? r.getException().getMessagingErrorCode() : null;
                    // Token gone for good → drop it so we stop trying.
                    if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                        invalid.add(chunk.get(j));
                    }
                }
            }
            invalid.forEach(this::removeToken);
            if (!invalid.isEmpty()) log.info("Pruned {} stale FCM tokens", invalid.size());
        } catch (Exception e) {
            log.warn("Failed to send academy push", e);
        }
    }
}
