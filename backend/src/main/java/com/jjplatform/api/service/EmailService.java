package com.jjplatform.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Sends transactional emails through Brevo's HTTP API (https://api.brevo.com/v3/smtp/email).
 *
 * <p>We use the HTTP API instead of SMTP on purpose: Railway blocks outbound SMTP ports
 * (587, 2525, ...) to curb spam, so a JavaMail/SMTP send just times out. The HTTP API goes
 * over HTTPS (443), which is never blocked.
 *
 * <p>When the Brevo API key is not configured (local dev), the temp password is logged instead
 * so the flow keeps working without sending real email. Sends are synchronous so a failure
 * surfaces to the caller and the user is told to retry, rather than seeing a false success.
 */
@Service
@Slf4j
public class EmailService {

    private static final String SEND_PATH = "/smtp/email";

    private final RestClient brevoClient;
    private final boolean enabled;

    @Value("${app.mail.from:no-reply@jjplatform.local}")
    private String fromAddress;

    @Value("${app.mail.from-name:JJPlatform}")
    private String fromName;

    @Value("${app.mail.login-url:http://localhost:5173/login}")
    private String loginUrl;

    @Value("${app.mail.student-login-url:http://localhost:5173/login}")
    private String studentLoginUrl;

    public EmailService(@Value("${app.mail.brevo-api-key:}") String apiKey) {
        this.enabled = apiKey != null && !apiKey.isBlank();
        this.brevoClient = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .defaultHeader("api-key", apiKey)
                .defaultHeader("accept", "application/json")
                .build();
    }

    /**
     * Sends a welcome email to a newly-created staff user with their temporary password.
     */
    public void sendStaffWelcomeEmail(String toEmail, String tempPassword, String role, String academyName) {
        String subject = "Bienvenido a " + (academyName != null ? academyName : "JJPlatform");
        String html = buildBody(toEmail, tempPassword, role, academyName);
        send(toEmail, subject, html, tempPassword);
    }

    /**
     * Sends a welcome email to a student who self-registered for the portal, with their temporary password.
     */
    public void sendStudentWelcomeEmail(String toEmail, String tempPassword, String studentName, String academyName) {
        String subject = "Tu acceso a " + (academyName != null ? academyName : "JJPlatform");
        String html = buildStudentBody(toEmail, tempPassword, studentName, academyName);
        send(toEmail, subject, html, tempPassword);
    }

    private void send(String toEmail, String subject, String htmlContent, String tempPassword) {
        if (!enabled) {
            log.warn("[EMAIL DISABLED] Brevo API key not configured. Temp password for {}: {}",
                    toEmail, tempPassword);
            return;
        }

        Map<String, Object> payload = Map.of(
                "sender", Map.of("name", fromName, "email", fromAddress),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "htmlContent", htmlContent);

        try {
            brevoClient.post()
                    .uri(SEND_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email sent to {} via Brevo API", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {} via Brevo API: {}", toEmail, e.getMessage());
            throw new IllegalStateException("No se pudo enviar el correo. Intenta de nuevo más tarde.");
        }
    }

    private String buildStudentBody(String email, String tempPassword, String studentName, String academyName) {
        String name = studentName != null ? studentName : "alumno";
        String academy = academyName != null ? academyName : "tu academia";
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                  <h2 style="color:#111827">¡Hola %s!</h2>
                  <p>Se ha creado tu cuenta de alumno en <strong>%s</strong> para que puedas ver tu información.</p>
                  <p>Tus credenciales de acceso son:</p>
                  <table style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
                    <tr><td><strong>Email:</strong></td><td>%s</td></tr>
                    <tr><td><strong>Contraseña temporal:</strong></td><td><code>%s</code></td></tr>
                  </table>
                  <p>Por seguridad, deberás cambiar esta contraseña al iniciar sesión por primera vez.</p>
                  <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ingresar</a></p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                  <p style="font-size:12px;color:#6b7280">Si no esperabas este correo, puedes ignorarlo.</p>
                </div>
                """.formatted(name, academy, email, tempPassword, studentLoginUrl);
    }

    private String buildBody(String email, String tempPassword, String role, String academyName) {
        String roleLabel = "PROFESOR".equals(role) ? "Profesor" : "Encargado";
        String academy = academyName != null ? academyName : "tu academia";
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                  <h2 style="color:#111827">¡Bienvenido a %s!</h2>
                  <p>Se ha creado una cuenta para ti como <strong>%s</strong>.</p>
                  <p>Tus credenciales de acceso son:</p>
                  <table style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
                    <tr><td><strong>Email:</strong></td><td>%s</td></tr>
                    <tr><td><strong>Contraseña temporal:</strong></td><td><code>%s</code></td></tr>
                  </table>
                  <p>Por seguridad, deberás cambiar esta contraseña al iniciar sesión por primera vez.</p>
                  <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ingresar</a></p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                  <p style="font-size:12px;color:#6b7280">Si no esperabas este correo, puedes ignorarlo.</p>
                </div>
                """.formatted(academy, roleLabel, email, tempPassword, loginUrl);
    }
}
