package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Emails sent once an online payment is confirmed by the gateway: a heads-up to the academy staff
 * (owner + optional extra address, unless the academy turned it off) and a receipt to whoever paid
 * (the student or their guardian). Best effort: failures are logged, never thrown, so they can't
 * affect the payment itself.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentNotificationService {

    private static final String[] MONTHS = {"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
            "agosto", "septiembre", "octubre", "noviembre", "diciembre"};
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public void notifyPaid(Long paymentId) {
        try {
            Payment p = paymentRepository.findById(paymentId).orElse(null);
            if (p == null) return;
            notifyStaff(p);
            sendReceipt(p);
        } catch (Exception e) {
            log.error("Could not send payment notifications for payment {}: {}", paymentId, e.getMessage());
        }
    }

    /**
     * The gateway confirmed a payment for a month that was already paid (a second checkout attempt
     * also went through, or staff recorded it by hand meanwhile): the money arrived twice. Always
     * sent, even with payment emails turned off, because someone has to decide on a refund.
     */
    @Transactional(readOnly = true)
    public void notifyDuplicate(Long paymentId, String method, String gatewayPaymentId, Object gatewayAmount) {
        try {
            Payment p = paymentRepository.findById(paymentId).orElse(null);
            if (p == null) return;
            List<String> to = staffRecipients(p.getAcademy());
            if (to.isEmpty()) return;

            Student s = p.getStudent();
            String period = period(p);
            String amount = gatewayAmount != null ? money(new BigDecimal(String.valueOf(gatewayAmount))) : "—";
            String subject = "Revisar: pago duplicado de " + s.getName() + " · " + period;
            String html = """
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                      <h2 style="color:#b45309">Posible pago duplicado</h2>
                      <p><strong>%s</strong> pagó <strong>%s</strong> por %s la mensualidad de <strong>%s</strong>, pero ese mes ya figuraba como pagado.</p>
                      <table style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">%s%s%s%s</table>
                      <p>Revisa el pago en tu cuenta de %s y, si corresponde, gestiona la devolución desde allí. La plataforma no modificó el registro del mes.</p>
                      <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ir al panel</a></p>
                    </div>
                    """.formatted(esc(s.getName()), amount, methodLabel(method), period,
                    row("Alumno", esc(s.getName())), row("Mes", period), row("Monto recibido", amount),
                    row("N° operación", esc(gatewayPaymentId)), methodLabel(method), emailService.getStaffLoginUrl());
            emailService.sendNotification(to, subject, html);
        } catch (Exception e) {
            log.error("Could not send duplicate-payment alert for payment {}: {}", paymentId, e.getMessage());
        }
    }

    private static List<String> staffRecipients(Academy academy) {
        Set<String> to = new LinkedHashSet<>();
        if (academy.getUser() != null && academy.getUser().getEmail() != null) to.add(academy.getUser().getEmail());
        if (academy.getPaymentNotifyEmail() != null) to.add(academy.getPaymentNotifyEmail());
        return new ArrayList<>(to);
    }

    private void notifyStaff(Payment p) {
        Academy academy = p.getAcademy();
        if (Boolean.FALSE.equals(academy.getPaymentNotifyEnabled())) return;

        List<String> to = staffRecipients(academy);
        if (to.isEmpty()) return;

        Student s = p.getStudent();
        String period = period(p);
        String subject = "Pago recibido: " + s.getName() + " · " + period;
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                  <h2 style="color:#111827">Nuevo pago en línea</h2>
                  <p><strong>%s</strong> pagó la mensualidad de <strong>%s</strong>.</p>
                  %s
                  <p>El pago ya figura como pagado en la sección Pagos.</p>
                  <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ir al panel</a></p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                  <p style="font-size:12px;color:#6b7280">Puedes desactivar estos avisos en Configuración → Pagos en línea.</p>
                </div>
                """.formatted(esc(s.getName()), period, detailTable(p, true), emailService.getStaffLoginUrl());
        emailService.sendNotification(to, subject, html);
    }

    private void sendReceipt(Payment p) {
        Student s = p.getStudent();
        String to = p.getPaidBy() != null ? p.getPaidBy().getEmail() : s.getEmail();
        if (to == null || to.isBlank()) return;

        String academyName = p.getAcademy().getName();
        String period = period(p);
        String subject = "Comprobante de pago · " + academyName + " · " + period;
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                  <h2 style="color:#111827">¡Pago recibido!</h2>
                  <p><strong>%s</strong> confirmó el pago de la mensualidad de <strong>%s</strong> de <strong>%s</strong>.</p>
                  %s
                  <p>Puedes ver el estado de tus pagos en la app, sección Pagos.</p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                  <p style="font-size:12px;color:#6b7280">Este correo es un comprobante interno de la academia, no una boleta.</p>
                </div>
                """.formatted(esc(academyName), period, esc(s.getName()), detailTable(p, false));
        emailService.sendNotification(List.of(to), subject, html);
    }

    private String detailTable(Payment p, boolean forStaff) {
        StringBuilder rows = new StringBuilder();
        rows.append(row("Alumno", esc(p.getStudent().getName())));
        rows.append(row("Mes", period(p)));
        rows.append(row("Monto", money(p.getAmount())));
        rows.append(row("Medio", methodLabel(p.getMethod())));
        if (p.getPaidAt() != null) rows.append(row("Fecha", p.getPaidAt().format(DATE_TIME)));
        if (forStaff) rows.append(row("Pagado por", payerLabel(p)));
        if (p.getGatewayPaymentId() != null) rows.append(row("N° operación", esc(p.getGatewayPaymentId())));
        return "<table style=\"background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0\">" + rows + "</table>";
    }

    private static String row(String label, String value) {
        return "<tr><td style=\"padding:2px 12px 2px 0\"><strong>" + label + ":</strong></td><td>" + value + "</td></tr>";
    }

    private static String payerLabel(Payment p) {
        User payer = p.getPaidBy();
        if (payer == null) return "—";
        User owner = p.getStudent().getUser();
        boolean guardian = owner == null || !owner.getId().equals(payer.getId());
        return (guardian ? "Apoderado (" : "El alumno (") + esc(payer.getEmail()) + ")";
    }

    private static String period(Payment p) {
        return MONTHS[p.getMonth() - 1] + " " + p.getYear();
    }

    private static String methodLabel(String method) {
        if (PaymentGatewayService.KHIPU.equals(method)) return "Khipu";
        if (PaymentGatewayService.MERCADO_PAGO.equals(method)) return "Mercado Pago";
        return method != null ? esc(method) : "—";
    }

    private static String money(BigDecimal amount) {
        NumberFormat f = NumberFormat.getIntegerInstance(Locale.forLanguageTag("es-CL"));
        return "$" + f.format(amount);
    }

    private static String esc(String v) {
        return v == null ? "" : HtmlUtils.htmlEscape(v);
    }
}
