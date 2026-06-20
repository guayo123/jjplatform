package com.jjplatform.api.controller;

import com.jjplatform.api.model.User;
import com.jjplatform.api.service.PushService;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin maintainer to push a free notification to students. An academy admin/staff reaches their
 * own academy; only the super admin may target ALL academies (scope=ALL).
 */
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final PushService pushService;
    private final SecurityHelper securityHelper;

    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, Integer>> broadcast(@RequestBody Map<String, String> body) {
        String title = trim(body.get("title"));
        String message = trim(body.get("body"));
        if (title == null || message == null) {
            throw new IllegalArgumentException("El título y el mensaje son obligatorios.");
        }
        if (title.length() > 80) title = title.substring(0, 80);
        if (message.length() > 240) message = message.substring(0, 240);

        Long academyId;
        if ("ALL".equalsIgnoreCase(body.get("scope"))) {
            if (securityHelper.getCurrentUser().getRole() != User.Role.SUPER_ADMIN) {
                throw new IllegalArgumentException("Solo el super admin puede enviar a todas las academias.");
            }
            academyId = null; // all academies
        } else {
            academyId = securityHelper.getCurrentAcademyId();
        }

        int sent = pushService.broadcast(academyId, title, message);
        return ResponseEntity.ok(Map.of("sent", sent));
    }

    private static String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
