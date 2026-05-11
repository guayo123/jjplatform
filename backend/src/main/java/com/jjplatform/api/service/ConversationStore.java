package com.jjplatform.api.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for WhatsApp conversation histories, keyed by phone number.
 * Sessions expire after 30 minutes of inactivity and are cleaned up every 5 minutes.
 */
@Component
public class ConversationStore {

    private static final int MAX_MESSAGES = 20;   // 10 user+assistant turn pairs
    private static final Duration TTL = Duration.ofMinutes(30);

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public List<Map<String, String>> getHistory(String phone) {
        Session session = sessions.get(phone);
        if (session == null) return List.of();
        if (session.isExpired()) {
            sessions.remove(phone);
            return List.of();
        }
        return List.copyOf(session.messages);
    }

    public void append(String phone, String role, String content) {
        sessions.compute(phone, (k, s) -> {
            if (s == null || s.isExpired()) s = new Session();
            s.add(role, content);
            return s;
        });
    }

    public void clear(String phone) {
        sessions.remove(phone);
    }

    @Scheduled(fixedDelay = 300_000)
    public void evictExpired() {
        sessions.entrySet().removeIf(e -> e.getValue().isExpired());
    }

    private static class Session {
        final List<Map<String, String>> messages = new ArrayList<>();
        Instant lastActivity = Instant.now();

        boolean isExpired() {
            return Duration.between(lastActivity, Instant.now()).compareTo(TTL) > 0;
        }

        void add(String role, String content) {
            messages.add(Map.of("role", role, "content", content));
            while (messages.size() > MAX_MESSAGES) messages.remove(0);
            lastActivity = Instant.now();
        }
    }
}
