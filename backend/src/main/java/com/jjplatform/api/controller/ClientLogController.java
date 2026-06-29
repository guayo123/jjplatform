package com.jjplatform.api.controller;

import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight client-event log for debugging from the native app — the app POSTs small events here
 * (push lifecycle, icon change) and they surface in the Railway logs, labeled by the student's RUT.
 * Restricted to the STUDENT role by SecurityConfig (/api/portal/**). Ownership isn't strictly enforced
 * because this only writes a log line; it stores nothing.
 */
@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
@Slf4j
public class ClientLogController {

    private final StudentRepository studentRepository;

    @PostMapping("/students/{studentId}/client-log")
    public ResponseEntity<Void> clientLog(@PathVariable Long studentId, @RequestBody Map<String, String> body) {
        String who = studentRepository.findById(studentId)
                .map(s -> {
                    if (s.getRut() != null && !s.getRut().isBlank()) return s.getRut();
                    if (s.getEmail() != null && !s.getEmail().isBlank()) return s.getEmail();
                    return (s.getName() != null ? s.getName() : "alumno") + " #" + s.getId();
                })
                .orElse("student#" + studentId);
        log.info("Client [{}] · {} · {}", body.get("event"), who, body.getOrDefault("detail", ""));
        return ResponseEntity.noContent().build();
    }
}
