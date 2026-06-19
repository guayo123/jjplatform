package com.jjplatform.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/**
 * Initializes the Firebase Admin SDK from a service-account JSON supplied via
 * {@code app.firebase.credentials} (the whole file's contents). When the value is blank
 * (local dev / not configured), it stays a no-op and {@code PushService} silently skips —
 * the app boots fine without Firebase.
 */
@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${app.firebase.credentials:}")
    private String credentialsJson;

    @PostConstruct
    public void init() {
        if (credentialsJson == null || credentialsJson.isBlank()) {
            log.warn("Firebase credentials not set (app.firebase.credentials) — push notifications disabled.");
            return;
        }
        if (!FirebaseApp.getApps().isEmpty()) return; // already initialized
        try {
            GoogleCredentials creds = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8)));
            FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(creds).build());
            log.info("Firebase initialized — push notifications enabled.");
        } catch (Exception e) {
            log.error("Failed to initialize Firebase; push notifications disabled.", e);
        }
    }
}
