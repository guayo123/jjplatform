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
 * (the student or their guardian). Also the emails of the bank-transfer review: a receipt to review
 * (staff), and its approval (receipt) or rejection (reason) to the payer. Best effort: failures are logged, never thrown, so they can't
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

    /**
     * One gateway payment just confirmed: usually one month, or several when a guardian paid all
     * their children's months together - then the staff and the payer get a single email listing them.
     */
    @Transactional(readOnly = true)
    public void notifyPaid(List<Long> paymentIds) {
        try {
            List<Payment> payments = load(paymentIds);
            if (payments.isEmpty()) return;
            notifyStaff(payments);
            sendReceipt(payments);
        } catch (Exception e) {
            log.error("Could not send payment notifications for payments {}: {}", paymentIds, e.getMessage());
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

    /**
     * A student / guardian sent a transfer receipt: tell the staff there is one to review (same
     * on/off setting as the online-payment emails). One email per receipt, even if it covers several months.
     */
    @Transactional(readOnly = true)
    public void notifyTransferSubmitted(List<Long> paymentIds) {
        try {
            List<Payment> payments = load(paymentIds);
            if (payments.isEmpty()) return;
            Payment p = payments.get(0);
            if (Boolean.FALSE.equals(p.getAcademy().getPaymentNotifyEnabled())) return;
            List<String> to = staffRecipients(p.getAcademy());
            if (to.isEmpty()) return;

            String subject = "Comprobante por revisar: " + names(payments) + " · " + period(p);
            String proof = p.getProofUrl() != null
                    ? "<p><a href=\"%s\">Ver comprobante</a></p>".formatted(esc(p.getProofUrl())) : "";
            String html = """
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                      <h2 style="color:#111827">Nuevo comprobante de transferencia</h2>
                      <p>%s envió un comprobante por la mensualidad de <strong>%s</strong>. Revisa que la transferencia haya llegado a tu cuenta y apruébalo o recházalo.</p>
                      %s
                      %s
                      <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Revisar en Pagos</a></p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                      <p style="font-size:12px;color:#6b7280">Puedes desactivar estos avisos en Configuración → Pagos en línea.</p>
                    </div>
                    """.formatted(payerLabel(p), period(p), detailTable(payments, true), proof, emailService.getStaffLoginUrl());
            emailService.sendNotification(to, subject, html);
        } catch (Exception e) {
            log.error("Could not send transfer-receipt alert for payments {}: {}", paymentIds, e.getMessage());
        }
    }

    /** Staff approved a transfer receipt: the payer gets the usual payment receipt. */
    @Transactional(readOnly = true)
    public void notifyTransferApproved(List<Long> paymentIds) {
        try {
            List<Payment> payments = load(paymentIds);
            if (!payments.isEmpty()) sendReceipt(payments);
        } catch (Exception e) {
            log.error("Could not send transfer receipt for payments {}: {}", paymentIds, e.getMessage());
        }
    }

    /** Staff rejected a transfer receipt: tell the payer why, so they can send it again or pay another way. */
    @Transactional(readOnly = true)
    public void notifyTransferRejected(List<Long> paymentIds, String reason) {
        try {
            List<Payment> payments = load(paymentIds);
            if (payments.isEmpty()) return;
            Payment p = payments.get(0);
            String to = p.getPaidBy() != null ? p.getPaidBy().getEmail() : p.getStudent().getEmail();
            if (to == null || to.isBlank()) return;

            String academyName = p.getAcademy().getName();
            String subject = "Revisa tu comprobante · " + academyName + " · " + period(p);
            String html = """
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                      <h2 style="color:#b45309">No pudimos validar tu transferencia</h2>
                      <p><strong>%s</strong> revisó el comprobante de la mensualidad de <strong>%s</strong> de <strong>%s</strong> y no lo pudo aprobar.</p>
                      <table style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">%s</table>
                      <p>Puedes enviar el comprobante de nuevo o pagar con otro medio desde la app, sección Pagos.</p>
                    </div>
                    """.formatted(esc(academyName), period(p), esc(names(payments)),
                    row("Motivo", esc(reason != null && !reason.isBlank() ? reason : "Sin detalle")));
            emailService.sendNotification(List.of(to), subject, html);
        } catch (Exception e) {
            log.error("Could not send transfer-rejected email for payments {}: {}", paymentIds, e.getMessage());
        }
    }

    private List<Payment> load(List<Long> paymentIds) {
        return paymentRepository.findAllById(paymentIds).stream()
                .sorted(java.util.Comparator.comparing(Payment::getId)).toList();
    }

    private static List<String> staffRecipients(Academy academy) {
        Set<String> to = new LinkedHashSet<>();
        if (academy.getUser() != null && academy.getUser().getEmail() != null) to.add(academy.getUser().getEmail());
        if (academy.getPaymentNotifyEmail() != null) to.add(academy.getPaymentNotifyEmail());
        return new ArrayList<>(to);
    }

    private void notifyStaff(List<Payment> payments) {
        Payment p = payments.get(0);
        Academy academy = p.getAcademy();
        if (Boolean.FALSE.equals(academy.getPaymentNotifyEnabled())) return;

        List<String> to = staffRecipients(academy);
        if (to.isEmpty()) return;

        String period = period(p);
        boolean several = payments.size() > 1;
        String subject = "Pago recibido: " + names(payments) + " · " + period;
        String lead = several
                ? "Se pagaron en un solo pago las mensualidades de <strong>%s</strong> de <strong>%d alumnos</strong>.".formatted(period, payments.size())
                : "<strong>%s</strong> pagó la mensualidad de <strong>%s</strong>.".formatted(esc(p.getStudent().getName()), period);
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
                  <h2 style="color:#111827">Nuevo pago en línea</h2>
                  <p>%s</p>
                  %s
                  <p>%s en la sección Pagos.</p>
                  <p><a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ir al panel</a></p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                  <p style="font-size:12px;color:#6b7280">Puedes desactivar estos avisos en Configuración → Pagos en línea.</p>
                </div>
                """.formatted(lead, detailTable(payments, true),
                several ? "Cada mensualidad ya figura como pagada" : "El pago ya figura como pagado",
                emailService.getStaffLoginUrl());
        emailService.sendNotification(to, subject, html);
    }

    private void sendReceipt(List<Payment> payments) {
        Payment p = payments.get(0);
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
                """.formatted(esc(academyName), period, esc(names(payments)), detailTable(payments, false));
        emailService.sendNotification(List.of(to), subject, html);
    }

    /** "Ana", "Ana y Luis", "Ana, Luis y Sofía". */
    private static String names(List<Payment> payments) {
        List<String> n = payments.stream().map(x -> x.getStudent().getName()).toList();
        if (n.size() == 1) return n.get(0);
        return String.join(", ", n.subList(0, n.size() - 1)) + " y " + n.get(n.size() - 1);
    }

    private String detailTable(List<Payment> payments, boolean forStaff) {
        Payment p = payments.get(0);
        StringBuilder rows = new StringBuilder();
        if (payments.size() == 1) {
            rows.append(row("Alumno", esc(p.getStudent().getName())));
        } else {
            // One line per student of the joint payment, with the discount it carried.
            for (Payment m : payments) {
                String value = money(m.getAmount());
                if (m.getExpectedAmount() != null && m.getExpectedAmount().compareTo(m.getAmount()) > 0) {
                    value += " <span style=\"color:#6b7280\">(" + esc(m.getNotes() != null ? m.getNotes() : "Descuento")
                            + " −" + money(m.getExpectedAmount().subtract(m.getAmount())) + ")</span>";
                }
                rows.append(row(esc(m.getStudent().getName()), value));
            }
        }
        rows.append(row("Mes", period(p)));
        rows.append(row(payments.size() > 1 ? "Total" : "Monto",
                money(payments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add))));
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
        if (PaymentService.TRANSFER.equals(method)) return "Transferencia";
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
