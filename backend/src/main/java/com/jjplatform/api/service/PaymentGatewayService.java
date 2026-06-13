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
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Online-payment gateways (Khipu and Mercado Pago). Each academy stores its own credentials,
 * so the flow is multi-tenant: we embed our internal payment id in the notify/notification URL
 * path so the webhook can resolve the academy (and its credentials) without trusting the caller.
 * Confirmation always re-queries the gateway before marking a payment PAID.
 */
@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayService.class);

    private static final String KHIPU_BASE = "https://payment-api.khipu.com/v3";
    private static final String MP_BASE = "https://api.mercadopago.com";

    public static final String KHIPU = "KHIPU";
    public static final String MERCADO_PAGO = "MERCADO_PAGO";

    private final RestTemplate restTemplate;
    private final PaymentRepository paymentRepository;
    private final AcademyRepository academyRepository;
    private final PaymentService paymentService;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.portal-url}")
    private String portalUrl;

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
     * reconcile it.
     */
    public String createCheckout(Long studentId, Long academyId, int month, int year, String method) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        Payment payment = paymentService.getOrCreatePendingPayment(studentId, academyId, month, year, method);
        int amount = payment.getAmount().intValueExact();
        String subject = "Mensualidad " + month + "/" + year + " - " + academy.getName();

        return switch (method) {
            case KHIPU -> createKhipu(academy, payment, amount, subject);
            case MERCADO_PAGO -> createMercadoPago(academy, payment, amount, subject);
            default -> throw new IllegalArgumentException("Método de pago no soportado: " + method);
        };
    }

    // ── Khipu ────────────────────────────────────────────────────────────────

    private String createKhipu(Academy academy, Payment payment, int amount, String subject) {
        requireCredential(academy.getKhipuApiKey(), "Khipu no está configurado en tu academia.");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", academy.getKhipuApiKey());

        Map<String, Object> body = Map.of(
                "amount", amount,
                "currency", "CLP",
                "subject", subject,
                "transaction_id", String.valueOf(payment.getId()),
                "return_url", portalUrl,
                "cancel_url", portalUrl,
                "notify_url", baseUrl + "/api/public/webhooks/khipu/" + payment.getId());

        Map<?, ?> resp = restTemplate.postForObject(
                KHIPU_BASE + "/payments", new HttpEntity<>(body, headers), Map.class);
        if (resp == null || resp.get("payment_url") == null) {
            throw new IllegalStateException("Khipu no devolvió una URL de pago.");
        }
        Object khipuId = resp.get("payment_id");
        if (khipuId != null) {
            payment.setGatewayPaymentId(String.valueOf(khipuId));
            paymentRepository.save(payment);
        }
        return String.valueOf(resp.get("payment_url"));
    }

    /** Verifies a Khipu notification and marks the payment PAID when the transfer is confirmed. */
    public void handleKhipuWebhook(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) { log.warn("Khipu webhook for unknown payment {}", paymentId); return; }
        if ("PAID".equals(payment.getStatus())) return;

        Academy academy = payment.getAcademy();
        if (academy.getKhipuApiKey() == null || payment.getGatewayPaymentId() == null) return;

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", academy.getKhipuApiKey());
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    KHIPU_BASE + "/payments/" + payment.getGatewayPaymentId(),
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<?, ?> p = resp.getBody();
            if (p != null && "done".equalsIgnoreCase(String.valueOf(p.get("status")))) {
                paymentService.markPaidByGateway(paymentId, KHIPU, payment.getGatewayPaymentId());
            }
        } catch (Exception e) {
            log.warn("Khipu verification failed for payment {}: {}", paymentId, e.getMessage());
        }
    }

    // ── Mercado Pago ───────────────────────────────────────────────────────────

    private String createMercadoPago(Academy academy, Payment payment, int amount, String subject) {
        requireCredential(academy.getMpAccessToken(), "Mercado Pago no está configurado en tu academia.");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(academy.getMpAccessToken());

        Map<String, Object> body = Map.of(
                "items", List.of(Map.of(
                        "title", subject,
                        "quantity", 1,
                        "unit_price", amount,
                        "currency_id", "CLP")),
                "external_reference", String.valueOf(payment.getId()),
                "back_urls", Map.of("success", portalUrl, "failure", portalUrl, "pending", portalUrl),
                "auto_return", "approved",
                "notification_url", baseUrl + "/api/public/webhooks/mp/" + payment.getId());

        Map<?, ?> resp = restTemplate.postForObject(
                MP_BASE + "/checkout/preferences", new HttpEntity<>(body, headers), Map.class);
        if (resp == null || resp.get("init_point") == null) {
            throw new IllegalStateException("Mercado Pago no devolvió una URL de pago.");
        }
        if (resp.get("id") != null) {
            payment.setGatewayPaymentId(String.valueOf(resp.get("id")));
            paymentRepository.save(payment);
        }
        return String.valueOf(resp.get("init_point"));
    }

    /**
     * Verifies a Mercado Pago notification. MP appends the paid payment id as a query param; we
     * re-query it with the academy token and confirm it's approved and points back to our payment.
     */
    public void handleMercadoPagoWebhook(Long paymentId, String mpPaymentId) {
        if (mpPaymentId == null || mpPaymentId.isBlank()) return;
        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) { log.warn("MP webhook for unknown payment {}", paymentId); return; }
        if ("PAID".equals(payment.getStatus())) return;

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
            boolean approved = "approved".equalsIgnoreCase(String.valueOf(p.get("status")));
            boolean matches = String.valueOf(payment.getId()).equals(String.valueOf(p.get("external_reference")));
            if (approved && matches) {
                paymentService.markPaidByGateway(paymentId, MERCADO_PAGO, mpPaymentId);
            }
        } catch (Exception e) {
            log.warn("Mercado Pago verification failed for payment {}: {}", paymentId, e.getMessage());
        }
    }

    private void requireCredential(String value, String message) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(message);
    }
}
