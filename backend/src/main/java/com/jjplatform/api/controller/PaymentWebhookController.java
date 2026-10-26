package com.jjplatform.api.controller;

import com.jjplatform.api.service.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public payment-gateway webhooks. The academy is resolved from the internal payment id embedded
 * in the path (set as the notify/notification URL when the checkout was created), so the call is
 * multi-tenant and never trusts caller-supplied credentials. The service always re-queries the
 * gateway before marking a payment paid. Mapped under /api/public/webhooks/** (permitAll POST).
 */
@RestController
@RequestMapping("/api/public/webhooks")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentGatewayService gatewayService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /**
     * Landing for the native app after the checkout: bounces the in-app browser to the app's custom
     * scheme (jjplatform://pagos) so the app comes back to the foreground. Shows a plain fallback
     * page when the browser does not follow the redirect.
     */
    @GetMapping(value = "/pay-return", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> payReturn(@RequestParam(required = false) String pago,
                                            @RequestParam(required = false) String alumno) {
        // Only digits pass through, so nothing caller-supplied ends up in the page as markup or script.
        String target = "jjplatform://pagos";
        if (isId(pago) && isId(alumno)) target += "?pago=" + pago + "&alumno=" + alumno;
        String html = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<body style='font-family:sans-serif;text-align:center;padding:48px'>"
                + "<h3>Volviendo a la app…</h3><p><a href='" + target + "'>Toca aquí si no se abre sola</a></p>"
                + "<script>location.href='" + target + "'</script></body>";
        return ResponseEntity.ok(html);
    }

    private static boolean isId(String v) {
        return v != null && v.matches("\\d{1,18}");
    }

    /**
     * Khipu calls this (POST) when a transfer is confirmed. The v3 notification body is JSON with the
     * Khipu {@code payment_id} — possibly an earlier attempt than the one we stored, if the student
     * retried. The body is only a hint: the service re-queries Khipu before trusting it.
     */
    @PostMapping("/khipu/{paymentId}")
    public ResponseEntity<Void> khipu(@PathVariable Long paymentId,
                                      @RequestBody(required = false) String body) {
        gatewayService.handleKhipuWebhook(paymentId, khipuPaymentId(body));
        return ResponseEntity.ok().build();
    }

    private String khipuPaymentId(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            Object id = objectMapper.readValue(body, Map.class).get("payment_id");
            return id != null ? String.valueOf(id) : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Mercado Pago calls this (POST). MP appends the paid payment id as a query param — either
     * {@code data.id} (new format) or {@code id} (legacy) — which we use to re-query and confirm.
     */
    @PostMapping("/mp/{paymentId}")
    public ResponseEntity<Void> mercadoPago(@PathVariable Long paymentId,
                                            @RequestParam Map<String, String> params) {
        String mpPaymentId = params.getOrDefault("data.id", params.get("id"));
        gatewayService.handleMercadoPagoWebhook(paymentId, mpPaymentId);
        return ResponseEntity.ok().build();
    }
}
