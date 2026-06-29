package com.jjplatform.api.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.AndroidConfig;
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

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        boolean isNew = dt.getId() == null;
        dt.setStudent(student);
        dt.setToken(token);
        dt.setPlatform(platform);
        tokenRepository.save(dt);
        log.info("Device token {} for {} ({})", isNew ? "registered" : "refreshed", label(student), platform);
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
        List<Recipient> recipients = new ArrayList<>();
        for (DeviceToken dt : tokenRepository.findByAcademyId(academyId)) {
            if (exceptStudentIds != null && exceptStudentIds.contains(dt.getStudent().getId())) continue;
            recipients.add(new Recipient(dt.getToken(), label(dt.getStudent())));
        }
        if (recipients.isEmpty()) {
            log.info("Push skipped: academy {} has no registered devices to notify", academyId);
            return;
        }
        CompletableFuture.runAsync(() -> dispatch(recipients, title, body));
    }

    /**
     * Send a push to the devices of specific students (e.g. the opponent + referee when a duel
     * is created). No-op when push is off or none of them have a registered device.
     */
    @Transactional(readOnly = true)
    public void sendToStudents(Collection<Long> studentIds, String title, String body) {
        if (studentIds == null || studentIds.isEmpty() || FirebaseApp.getApps().isEmpty()) return;
        List<Recipient> recipients = new ArrayList<>();
        for (DeviceToken dt : tokenRepository.findByStudentIdIn(studentIds)) {
            recipients.add(new Recipient(dt.getToken(), label(dt.getStudent())));
        }
        if (recipients.isEmpty()) {
            log.info("Push skipped: students {} have no registered devices", studentIds);
            return;
        }
        CompletableFuture.runAsync(() -> dispatch(recipients, title, body));
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
        List<Recipient> recipients = new ArrayList<>();
        for (DeviceToken dt : devices) recipients.add(new Recipient(dt.getToken(), label(dt.getStudent())));
        if (recipients.isEmpty()) return 0;
        CompletableFuture.runAsync(() -> dispatch(recipients, title, body));
        return recipients.size();
    }

    private void dispatch(List<Recipient> recipients, String title, String body) {
        log.info("Push dispatch start: '{}' → {} device(s)", title, recipients.size());
        try {
            Notification notification = Notification.builder().setTitle(title).setBody(body).build();
            // HIGH priority wakes the device immediately. Without it FCM uses "normal" priority,
            // which Android can hold for a long time in Doze / battery saver (the >1h delays).
            // A TTL avoids a stale duel alert popping up hours later if the phone was offline.
            AndroidConfig androidConfig = AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setTtl(Duration.ofHours(4).toMillis())
                    .build();
            List<String> invalid = new ArrayList<>();
            List<String> delivered = new ArrayList<>();   // RUT/correo of devices FCM accepted
            List<String> failures = new ArrayList<>();     // RUT/correo (errorCode) of devices that failed
            Map<String, Integer> errors = new HashMap<>(); // FCM error code → count, for the summary line
            for (int i = 0; i < recipients.size(); i += FCM_MULTICAST_LIMIT) {
                List<Recipient> chunk = recipients.subList(i, Math.min(i + FCM_MULTICAST_LIMIT, recipients.size()));
                MulticastMessage message = MulticastMessage.builder()
                        .setNotification(notification)
                        .setAndroidConfig(androidConfig)
                        .addAllTokens(chunk.stream().map(Recipient::token).toList())
                        .build();
                BatchResponse resp = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                List<SendResponse> responses = resp.getResponses();
                for (int j = 0; j < responses.size(); j++) {
                    Recipient rcpt = chunk.get(j);
                    SendResponse r = responses.get(j);
                    if (r.isSuccessful()) { delivered.add(rcpt.label()); continue; }
                    MessagingErrorCode code = r.getException() != null ? r.getException().getMessagingErrorCode() : null;
                    String name = code != null ? code.name() : "UNKNOWN";
                    errors.merge(name, 1, Integer::sum);
                    failures.add(rcpt.label() + " (" + name + ")");
                    // Token gone for good → drop it so we stop trying.
                    if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                        invalid.add(rcpt.token());
                    }
                }
            }
            invalid.forEach(this::removeToken);
            if (!invalid.isEmpty()) log.info("Pruned {} stale FCM tokens", invalid.size());
            log.info("Push dispatch done: '{}' → {} delivered, {} failed{}",
                    title, delivered.size(), failures.size(), errors.isEmpty() ? "" : " " + errors);
            if (!delivered.isEmpty()) log.info("Push '{}' delivered to: {}", title, summarize(delivered));
            if (!failures.isEmpty())  log.info("Push '{}' failed for: {}", title, summarize(failures));
        } catch (Exception e) {
            log.warn("Failed to send academy push", e);
        }
    }

    /** A target device + a human label (RUT / correo / nombre) so the log shows who was notified. */
    private record Recipient(String token, String label) {}

    /** Best identifier for logging: RUT, else email, else "Nombre #id". Resolved inside the caller's tx. */
    private static String label(Student s) {
        if (s == null) return "desconocido";
        if (s.getRut() != null && !s.getRut().isBlank()) return s.getRut();
        if (s.getEmail() != null && !s.getEmail().isBlank()) return s.getEmail();
        return (s.getName() != null ? s.getName() : "alumno") + " #" + s.getId();
    }

    /** Join labels for a log line, capping very long lists so a big academy doesn't blow up the log. */
    private static String summarize(List<String> labels) {
        int cap = 50;
        if (labels.size() <= cap) return String.join(", ", labels);
        return String.join(", ", labels.subList(0, cap)) + " … (+" + (labels.size() - cap) + ")";
    }
}
