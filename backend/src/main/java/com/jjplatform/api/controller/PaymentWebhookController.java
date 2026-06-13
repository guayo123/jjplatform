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

    /** Khipu calls this (POST) when a transfer changes state. */
    @PostMapping("/khipu/{paymentId}")
    public ResponseEntity<Void> khipu(@PathVariable Long paymentId) {
        gatewayService.handleKhipuWebhook(paymentId);
        return ResponseEntity.ok().build();
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
