package com.jjplatform.api.service;

import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Online-payment gateways (Khipu and Mercado Pago). Each academy stores its own credentials,
 * so the flow is multi-tenant: we embed our internal payment id in the notify/notification URL
 * path so the webhook can resolve the academy (and its credentials) without trusting the caller.
 * Confirmation always re-queries the gateway before marking a payment PAID.
 *
 * <p>Unhappy paths: a checkout that fails to start leaves no pending row behind; a pending
 * checkout older than {@link PaymentService#CHECKOUT_TIMEOUT} shows as "not completed" (and is no
 * longer polled); a Mercado Pago rejection is surfaced to the student; and a gateway confirmation
 * for a month that is already paid (a second attempt, or staff recorded it by hand meanwhile)
 * emails the staff so they can refund.
 */
@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayService.class);

    private static final String KHIPU_BASE = "https://payment-api.khipu.com/v3";
    private static final String MP_BASE = "https://api.mercadopago.com";

    public static final String KHIPU = "KHIPU";
    public static final String MERCADO_PAGO = "MERCADO_PAGO";

    private static final Set<String> MP_FAILED = Set.of("rejected", "cancelled");

    /** How long a Khipu payment link stays payable. */
    private static final java.time.Duration KHIPU_LINK_TTL = java.time.Duration.ofHours(1);

    private final RestTemplate restTemplate;
    private final PaymentRepository paymentRepository;
    private final AcademyRepository academyRepository;
    private final PaymentService paymentService;
    private final PaymentNotificationService paymentNotificationService;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.portal-url}")
    private String portalUrl;

    /** Web origins allowed to call the API (incl. academies' own domains); the checkout may return to them. */
    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    /** Which gateways the academy has configured (for the portal to show the right buttons). */
    public Map<String, Boolean> availableMethods(Long academyId) {
        Academy a = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        return Map.of(
                "khipu", a.getKhipuApiKey() != null && !a.getKhipuApiKey().isBlank(),
                "mercadoPago", a.getMpAccessToken() != null && !a.getMpAccessToken().isBlank());
    }

    /**
     * Creates a gateway payment for the student's monthly fee and returns the URL the student
     * must open to pay. A PENDING_CONFIRMATION payment row is created/reused so the webhook can
     * reconcile it; if the gateway call fails, a row created for this attempt is removed again.
     */
    public String createCheckout(Long studentId, Long academyId, int month, int year, String method, boolean fromApp,
                                 Long payerUserId, String origin) {
        return startCheckout(List.of(studentId), academyId, month, year, method, fromApp, payerUserId, origin);
    }

    /**
     * One checkout for several students of the same academy (a guardian paying all their children's
     * months at once). Months already paid are skipped; the rows share a {@link Payment#getCheckoutGroup()}
     * and are all marked PAID when the single gateway payment is confirmed.
     */
    public String createGroupCheckout(List<Long> studentIds, Long academyId, int month, int year, String method,
                                      boolean fromApp, Long payerUserId, String origin) {
        if (studentIds.isEmpty()) throw new IllegalArgumentException("No hay mensualidades para pagar.");
        return startCheckout(studentIds, academyId, month, year, method, fromApp, payerUserId, origin);
    }

    private String startCheckout(List<Long> studentIds, Long academyId, int month, int year, String method,
                                 boolean fromApp, Long payerUserId, String origin) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        // Validate before touching the payment rows, so a bad request never leaves a pending month behind.
        switch (method) {
            case KHIPU -> requireCredential(academy.getKhipuApiKey(), "Khipu no está configurado en tu academia.");
            case MERCADO_PAGO -> requireCredential(academy.getMpAccessToken(), "Mercado Pago no está configurado en tu academia.");
            default -> throw new IllegalArgumentException("Método de pago no soportado: " + method);
        }
        boolean several = studentIds.size() > 1;

        // A retry over an open Khipu attempt: confirm it if it was paid after all (then the month is
        // refused or skipped as already paid), otherwise cancel it so the old link can't be paid on top
        // of the new one. Siblings of a "pay all" share one Khipu payment: retire it once.
        Set<String> retired = new java.util.HashSet<>();
        for (Long studentId : studentIds) {
            paymentRepository.findByStudentIdAndMonthAndYear(studentId, month, year)
                    .filter(p -> PaymentService.onlineState(p) != null && KHIPU.equals(p.getMethod()) && p.getGatewayPaymentId() != null)
                    .filter(p -> retired.add(p.getGatewayPaymentId()))
                    .ifPresent(p -> retireKhipuAttempt(academy, p));
        }

        List<Payment> rows = new java.util.ArrayList<>();
        List<Long> freshRows = new java.util.ArrayList<>();
        try {
            for (Long studentId : studentIds) {
                if (several && paymentRepository.findByStudentIdAndMonthAndYear(studentId, month, year)
                        .map(p -> "PAID".equals(p.getStatus())).orElse(false)) continue;
                Payment row = paymentService.getOrCreatePendingPayment(studentId, academyId, month, year, method, payerUserId);
                if (row.getGatewayPaymentId() == null) freshRows.add(row.getId());
                rows.add(row);
            }
        } catch (RuntimeException e) {
            freshRows.forEach(paymentRepository::deleteById);
            throw e;
        }
        if (rows.isEmpty()) throw new IllegalArgumentException("Estas mensualidades ya están pagadas.");

        // The gateway reference: our payment id, or a shared group id when one checkout pays several months.
        String reference;
        if (rows.size() > 1) {
            reference = "grp-" + java.util.UUID.randomUUID();
            rows.forEach(r -> r.setCheckoutGroup(reference));
            paymentRepository.saveAll(rows);
        } else {
            reference = String.valueOf(rows.get(0).getId());
        }
        Payment lead = rows.get(0);
        int amount = rows.stream().map(Payment::getAmount).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add).intValueExact();
        String subject = (rows.size() > 1 ? "Mensualidades " + month + "/" + year + " (" + rows.size() + " alumnos)"
                : "Mensualidad " + month + "/" + year) + " - " + academy.getName();

        // The native app returns through a redirect to its custom scheme; the web goes back to the portal.
        // Both carry the payment + student so the portal opens that student's payments and the receipt.
        String query = "?pago=" + lead.getId() + "&alumno=" + lead.getStudent().getId();
        String returnUrl = (fromApp ? baseUrl + "/api/public/webhooks/pay-return" : webPortalUrl(origin)) + query;
        try {
            return KHIPU.equals(method)
                    ? createKhipu(academy, rows, reference, amount, subject, returnUrl)
                    : createMercadoPago(academy, rows, reference, amount, subject, returnUrl);
        } catch (RestClientException | IllegalStateException e) {
            log.warn("Could not start {} checkout for payment {}: {}", method, reference, e.getMessage());
            freshRows.forEach(paymentRepository::deleteById);
            String name = KHIPU.equals(method) ? "Khipu" : "Mercado Pago";
            throw new IllegalStateException("No pudimos conectar con " + name + ". Intenta de nuevo en unos minutos o usa otro medio de pago.");
        }
    }

    /** Stores the gateway payment id on every row of the checkout. */
    private void setGatewayId(List<Payment> rows, Object gatewayId) {
        if (gatewayId == null) return;
        rows.forEach(r -> r.setGatewayPaymentId(String.valueOf(gatewayId)));
        paymentRepository.saveAll(rows);
    }

    /** The row plus its siblings when it was paid in a "pay all" checkout. */
    private List<Payment> checkoutMembers(Payment payment) {
        if (payment.getCheckoutGroup() == null) return List.of(payment);
        List<Payment> members = paymentRepository.findByCheckoutGroupOrderByIdAsc(payment.getCheckoutGroup());
        return members.isEmpty() ? List.of(payment) : members;
    }

    /** Our reference sent to the gateway (transaction_id / external_reference). */
    private static String reference(Payment payment) {
        return payment.getCheckoutGroup() != null ? payment.getCheckoutGroup() : String.valueOf(payment.getId());
    }

    private static java.math.BigDecimal total(List<Payment> rows) {
        return rows.stream().map(Payment::getAmount).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
    }

    // ── Khipu ────────────────────────────────────────────────────────────────

    private String createKhipu(Academy academy, List<Payment> rows, String reference, int amount, String subject, String returnUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", academy.getKhipuApiKey());

        Map<String, Object> body = new java.util.HashMap<>(Map.of(
                "amount", amount,
                "currency", "CLP",
                "subject", subject,
                "transaction_id", reference,
                "return_url", returnUrl,
                "cancel_url", returnUrl,
                // Short-lived link (Khipu's default is 24 h): an abandoned checkout stops being payable
                // soon after the portal shows it as "not completed".
                "expires_date", java.time.Instant.now().plus(KHIPU_LINK_TTL).truncatedTo(java.time.temporal.ChronoUnit.SECONDS).toString()));
        // Khipu rejects a non-public notify_url. On a local backend we skip it: the portal's
        // reconciliation (reconcilePendingKhipu) still confirms the payment when the student returns.
        if (isPublicBaseUrl()) {
            body.put("notify_url", baseUrl + "/api/public/webhooks/khipu/" + rows.get(0).getId());
            body.put("notify_api_version", "3.0");
        }

        Map<?, ?> resp = restTemplate.postForObject(
                KHIPU_BASE + "/payments", new HttpEntity<>(body, headers), Map.class);
        if (resp == null || resp.get("payment_url") == null) {
            throw new IllegalStateException("Khipu no devolvió una URL de pago.");
        }
        setGatewayId(rows, resp.get("payment_id"));
        return String.valueOf(resp.get("payment_url"));
    }

    /**
     * Verifies a Khipu notification and marks the payment PAID when the transfer is confirmed.
     * {@code khipuPaymentId} is the id Khipu sent in the notification (it may be an EARLIER attempt
     * than the one we stored, if the student retried); without it we check the latest attempt.
     */
    public void handleKhipuWebhook(Long paymentId, String khipuPaymentId) {
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) { log.warn("Khipu webhook for unknown payment {}", paymentId); return; }

        String khipuId = khipuPaymentId != null && !khipuPaymentId.isBlank() ? khipuPaymentId : payment.getGatewayPaymentId();
        if (khipuId == null) return;
        List<Payment> members = checkoutMembers(payment);
        if (members.stream().allMatch(m -> alreadyRecorded(m, KHIPU, khipuId))) return;

        Academy academy = payment.getAcademy();
        if (academy.getKhipuApiKey() == null) return;

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", academy.getKhipuApiKey());
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    KHIPU_BASE + "/payments/" + khipuId,
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<?, ?> p = resp.getBody();
            if (p == null || !"done".equalsIgnoreCase(String.valueOf(p.get("status")))) {
                log.debug("Khipu payment {} (our {}) not done yet: status={} detail={}", khipuId, paymentId,
                        p != null ? p.get("status") : null, p != null ? p.get("status_detail") : null);
                return;
            }
            if (!reference(payment).equals(String.valueOf(p.get("transaction_id")))) {
                log.warn("Khipu payment {} does not belong to our payment {}", khipuId, paymentId);
                return;
            }
            if (!coversAmount(total(members), p.get("amount"))) {
                log.warn("Khipu payment {} confirmed with an amount below the expected {}", paymentId, total(members));
                return;
            }
            confirmAll(members, KHIPU, khipuId, p.get("amount"));
        } catch (Exception e) {
            log.warn("Khipu verification failed for payment {}: {}", paymentId, e.getMessage());
        }
    }

    /**
     * Before a transfer receipt replaces an unfinished Khipu checkout of the same month: confirms the
     * checkout if it was paid after all, otherwise cancels its link so it can't also be paid.
     */
    public void retireOpenKhipu(Payment pending, Long academyId) {
        if (!KHIPU.equals(pending.getMethod()) || pending.getGatewayPaymentId() == null
                || PaymentService.onlineState(pending) == null) return;
        academyRepository.findById(academyId)
                .filter(a -> a.getKhipuApiKey() != null && !a.getKhipuApiKey().isBlank())
                .ifPresent(a -> retireKhipuAttempt(a, pending));
    }

    /**
     * Before starting a new Khipu attempt: checks whether the previous one was paid (marks it PAID
     * if so) and otherwise cancels it in Khipu. Best effort — a failure here never blocks the retry;
     * a late payment of the old link is still caught as a duplicate.
     */
    private void retireKhipuAttempt(Academy academy, Payment pending) {
        handleKhipuWebhook(pending.getId(), null);
        if (paymentRepository.findById(pending.getId()).map(p -> "PAID".equals(p.getStatus())).orElse(true)) return;
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", academy.getKhipuApiKey());
        try {
            restTemplate.exchange(KHIPU_BASE + "/payments/" + pending.getGatewayPaymentId(),
                    HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
        } catch (RestClientException e) {
            log.info("Could not cancel previous Khipu attempt {}: {}", pending.getGatewayPaymentId(), e.getMessage());
        }
    }

    /**
     * Khipu notifies on bank reconciliation, which can lag behind the student's return from the
     * checkout. Re-checks the student's in-progress Khipu payments so the portal shows the real
     * status without waiting for the webhook. Expired attempts are left to the webhook alone.
     */
    public void reconcilePendingKhipu(Long studentId) {
        for (Payment p : paymentRepository.findByStudentIdOrderByYearDescMonthDesc(studentId)) {
            if (KHIPU.equals(p.getMethod()) && p.getGatewayPaymentId() != null
                    && PaymentService.ONLINE_IN_PROGRESS.equals(PaymentService.onlineState(p))) {
                handleKhipuWebhook(p.getId(), null);
            }
        }
    }

    // ── Mercado Pago ───────────────────────────────────────────────────────────

    private String createMercadoPago(Academy academy, List<Payment> rows, String reference, int amount, String subject, String returnUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(academy.getMpAccessToken());

        Map<String, Object> body = new java.util.HashMap<>(Map.of(
                "items", List.of(Map.of(
                        "title", subject,
                        "quantity", 1,
                        "unit_price", amount,
                        "currency_id", "CLP")),
                "external_reference", reference,
                "back_urls", Map.of("success", returnUrl, "failure", returnUrl, "pending", returnUrl),
                "auto_return", "approved"));
        // Same as Khipu: a local backend can't receive notifications, so don't send an unreachable URL.
        if (isPublicBaseUrl()) {
            body.put("notification_url", baseUrl + "/api/public/webhooks/mp/" + rows.get(0).getId());
        }

        Map<?, ?> resp = restTemplate.postForObject(
                MP_BASE + "/checkout/preferences", new HttpEntity<>(body, headers), Map.class);
        if (resp == null || resp.get("init_point") == null) {
            throw new IllegalStateException("Mercado Pago no devolvió una URL de pago.");
        }
        setGatewayId(rows, resp.get("id"));
        return String.valueOf(resp.get("init_point"));
    }

    /**
     * Verifies a Mercado Pago notification. MP appends the paid payment id as a query param; we
     * re-query it with the academy token and confirm it's approved and points back to our payment.
     * A rejected/cancelled attempt is recorded so the student sees it instead of "in progress".
     */
    public void handleMercadoPagoWebhook(Long paymentId, String mpPaymentId) {
        if (mpPaymentId == null || mpPaymentId.isBlank()) return;
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) { log.warn("MP webhook for unknown payment {}", paymentId); return; }
        List<Payment> members = checkoutMembers(payment);
        if (members.stream().allMatch(m -> alreadyRecorded(m, MERCADO_PAGO, mpPaymentId))) return;

        Academy academy = payment.getAcademy();
        if (academy.getMpAccessToken() == null) return;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(academy.getMpAccessToken());
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    MP_BASE + "/v1/payments/" + mpPaymentId,
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<?, ?> p = resp.getBody();
            if (p == null) return;
            if (!reference(payment).equals(String.valueOf(p.get("external_reference")))) return;

            String status = String.valueOf(p.get("status")).toLowerCase();
            if (MP_FAILED.contains(status)) {
                members.forEach(m -> paymentService.markGatewayRejected(m.getId()));
                return;
            }
            if (!"approved".equals(status)) return;
            if (!coversAmount(total(members), p.get("transaction_amount"))) {
                log.warn("MP payment {} approved with an amount below the expected {}", paymentId, total(members));
                return;
            }
            confirmAll(members, MERCADO_PAGO, mpPaymentId, p.get("transaction_amount"));
        } catch (Exception e) {
            log.warn("Mercado Pago verification failed for payment {}: {}", paymentId, e.getMessage());
        }
    }

    // ── Shared ─────────────────────────────────────────────────────────────────

    /** True when this exact gateway payment is the one already recorded (a repeated notification). */
    private static boolean alreadyRecorded(Payment payment, String method, String gatewayId) {
        return "PAID".equals(payment.getStatus()) && method.equals(payment.getMethod())
                && gatewayId.equals(payment.getGatewayPaymentId());
    }

    /**
     * Records a verified gateway payment for every month it covers. Months still pending become PAID
     * and get ONE set of emails for the whole payment; a month already paid by other means means the
     * money arrived twice → alert staff.
     */
    private void confirmAll(List<Payment> members, String method, String gatewayId, Object gatewayAmount) {
        List<Long> paid = new java.util.ArrayList<>();
        for (Payment m : members) {
            if (paymentService.markPaidByGateway(m.getId(), method, gatewayId)) {
                paid.add(m.getId());
            } else if (paymentService.claimDuplicateAlert(m.getId(), gatewayId)) {
                paymentNotificationService.notifyDuplicate(m.getId(), method, gatewayId, gatewayAmount);
            }
        }
        if (!paid.isEmpty()) paymentNotificationService.notifyPaid(paid);
    }

    /** True when the gateway reports at least the amount we charged (a missing value is not trusted). */
    private boolean coversAmount(java.math.BigDecimal expected, Object gatewayAmount) {
        if (gatewayAmount == null) return false;
        try {
            return new java.math.BigDecimal(String.valueOf(gatewayAmount)).compareTo(expected) >= 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Portal URL for the web return: the site the student paid from (an academy's own domain keeps the
     * student's session, which lives per domain), if it is one of the allowed origins; else the default.
     * Only exact allowed origins are used, so the return can't be pointed at an arbitrary site.
     */
    private String webPortalUrl(String origin) {
        if (origin == null || origin.isBlank()) return portalUrl;
        String o = origin.trim().replaceAll("/+$", "");
        boolean allowed = java.util.Arrays.stream(allowedOrigins.split(","))
                .map(s -> s.trim().replaceAll("/+$", ""))
                .anyMatch(o::equalsIgnoreCase);
        return allowed && o.startsWith("http") ? o + "/portal" : portalUrl;
    }

    /** False on a local backend (localhost / 127.0.0.1), whose URLs gateways can't reach. */
    private boolean isPublicBaseUrl() {
        String host = java.net.URI.create(baseUrl).getHost();
        return host != null && !host.equals("localhost") && !host.startsWith("127.");
    }

    private void requireCredential(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    }
}
