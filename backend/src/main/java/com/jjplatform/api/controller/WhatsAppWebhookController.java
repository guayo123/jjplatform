package com.jjplatform.api.controller;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.service.AcademyChatService;
import com.jjplatform.api.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/public/webhooks/whatsapp")
@RequiredArgsConstructor
public class WhatsAppWebhookController {

    private final AcademyRepository academyRepository;
    private final AcademyChatService academyChatService;
    private final WhatsAppService whatsAppService;

    /** Meta llama este endpoint para verificar el webhook al configurarlo. */
    @GetMapping("/{academyId}")
    public ResponseEntity<String> verify(
            @PathVariable Long academyId,
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.challenge") String challenge,
            @RequestParam("hub.verify_token") String verifyToken) {

        Academy academy = academyRepository.findById(academyId).orElse(null);
        if (academy == null) return ResponseEntity.notFound().build();
        if (!"subscribe".equals(mode)) return ResponseEntity.badRequest().build();
        if (!verifyToken.equals(academy.getWpVerifyToken())) return ResponseEntity.status(403).build();

        return ResponseEntity.ok(challenge);
    }

    /** Meta envía los mensajes entrantes aquí. */
    @PostMapping("/{academyId}")
    public ResponseEntity<String> receiveMessage(
            @PathVariable Long academyId,
            @RequestBody Map<String, Object> payload) {

        Academy academy = academyRepository.findById(academyId).orElse(null);
        if (academy == null
                || academy.getWpPhoneNumberId() == null
                || academy.getWpAccessToken() == null) {
            return ResponseEntity.ok("ok");
        }

        try {
            List<Map<String, Object>> entries = cast(payload.get("entry"));
            if (entries == null) return ResponseEntity.ok("ok");

            for (Map<String, Object> entry : entries) {
                List<Map<String, Object>> changes = cast(entry.get("changes"));
                if (changes == null) continue;

                for (Map<String, Object> change : changes) {
                    Map<String, Object> value = cast(change.get("value"));
                    if (value == null) continue;

                    List<Map<String, Object>> messages = cast(value.get("messages"));
                    if (messages == null) continue;

                    for (Map<String, Object> message : messages) {
                        String from = (String) message.get("from");
                        String type = (String) message.get("type");
                        if (from == null) continue;

                        // Solo procesamos texto; para otros tipos damos aviso amable
                        if (!"text".equals(type)) {
                            whatsAppService.sendMessage(
                                    academy.getWpPhoneNumberId(),
                                    academy.getWpAccessToken(),
                                    from,
                                    "Solo puedo responder mensajes de texto. ¿En qué te puedo ayudar?"
                            );
                            continue;
                        }

                        Map<String, Object> text = cast(message.get("text"));
                        if (text == null) continue;
                        String body = (String) text.get("body");
                        if (body == null || body.isBlank()) continue;

                        String reply = academyChatService.chat(academyId, from, body);
                        whatsAppService.sendMessage(
                                academy.getWpPhoneNumberId(),
                                academy.getWpAccessToken(),
                                from,
                                reply
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing WhatsApp webhook for academy {}: {}", academyId, e.getMessage());
        }

        return ResponseEntity.ok("ok");
    }

    @SuppressWarnings("unchecked")
    private <T> T cast(Object o) {
        try { return (T) o; } catch (ClassCastException e) { return null; }
    }
}
