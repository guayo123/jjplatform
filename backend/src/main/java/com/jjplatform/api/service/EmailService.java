package com.jjplatform.api.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@jjplatform.local}")
    private String fromAddress;

    @Value("${app.mail.from-name:JJPlatform}")
    private String fromName;

    @Value("${app.mail.login-url:http://localhost:5173/login}")
    private String loginUrl;

    @Value("${app.mail.student-login-url:http://localhost:5173/login}")
    private String studentLoginUrl;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    /**
     * Sends a welcome email to a newly-created staff user with their temporary password.
     * When SMTP credentials are not configured, logs the temp password instead so local dev keeps working.
     * Runs asynchronously so a slow/unreachable SMTP relay never blocks the HTTP request thread.
     */
    @Async
    public void sendStaffWelcomeEmail(String toEmail, String tempPassword, String role, String academyName) {
        if (smtpUser == null || smtpUser.isBlank() || mailSender == null) {
            log.warn("[EMAIL DISABLED] SMTP not configured. Temp password for {} ({}): {}",
                    toEmail, role, tempPassword);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(toEmail);
            helper.setSubject("Bienvenido a " + (academyName != null ? academyName : "JJPlatform"));
            helper.setText(buildBody(toEmail, tempPassword, role, academyName), true);
            mailSender.send(message);
            log.info("Welcome email sent to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
            throw new IllegalStateException("No se pudo enviar el correo de bienvenida. Intenta de nuevo más tarde.");
        }
    }

    /**
     * Sends a welcome email to a student who self-registered for the portal, with their temporary password.
     * When SMTP credentials are not configured, logs the temp password instead so local dev keeps working.
     * Runs asynchronously so a slow/unreachable SMTP relay never blocks the HTTP request thread.
     */
    @Async
    public void sendStudentWelcomeEmail(String toEmail, String tempPassword, String studentName, String academyName) {
        if (smtpUser == null || smtpUser.isBlank() || mailSender == null) {
            log.warn("[EMAIL DISABLED] SMTP not configured. Temp password for student {} ({}): {}",
                    studentName, toEmail, tempPassword);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(toEmail);
            helper.setSubject("Tu acceso a " + (academyName != null ? academyName : "JJPlatform"));
            helper.setText(buildStudentBody(toEmail, tempPassword, studentName, academyName), true);
            mailSender.send(message);
            log.info("Student welcome email sent to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send student welcome email to {}: {}", toEmail, e.getMessage());
            throw new IllegalStateException("No se pudo enviar el correo con tu clave temporal. Intenta de nuevo más tarde.");
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
