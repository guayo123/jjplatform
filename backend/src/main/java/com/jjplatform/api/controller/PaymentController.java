package com.jjplatform.api.controller;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.service.PaymentService;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.TransferService;
import com.jjplatform.api.dto.TransferReviewDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final TransferService transferService;
    private final SecurityHelper securityHelper;

    @GetMapping("/yearly")
    public ResponseEntity<List<PaymentDto>> getByYear(@RequestParam int year) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(paymentService.getPaymentsByYear(academyId, year));
    }

    @GetMapping
    public ResponseEntity<List<PaymentDto>> getByMonth(
            @RequestParam int month,
            @RequestParam int year) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(paymentService.getPaymentsByMonth(academyId, month, year));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<PaymentDto>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(paymentService.getPaymentsByStudent(studentId));
    }

    /** Transfer receipts sent from the portal that are waiting for staff review. */
    @GetMapping("/transfers/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<List<TransferReviewDto>> pendingTransfers() {
        return ResponseEntity.ok(transferService.pendingReviews(securityHelper.getCurrentAcademyId()));
    }

    /** The transfer arrived: marks every month of the receipt paid. Body (optional): {"amount": 30000} for a single month. */
    @PostMapping("/{id}/transfer/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<Void> approveTransfer(@PathVariable Long id,
                                                @RequestBody(required = false) Map<String, BigDecimal> body) {
        transferService.approve(id, securityHelper.getCurrentAcademyId(), body != null ? body.get("amount") : null);
        return ResponseEntity.noContent().build();
    }

    /** The transfer can't be validated. Body: {"reason": "..."} shown to the student. */
    @PostMapping("/{id}/transfer/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<Void> rejectTransfer(@PathVariable Long id,
                                               @RequestBody(required = false) Map<String, String> body) {
        transferService.reject(id, securityHelper.getCurrentAcademyId(), body != null ? body.get("reason") : null);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<PaymentDto> create(@Valid @RequestBody PaymentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        PaymentDto created = paymentService.createPayment(dto, academyId);
        return ResponseEntity.status(201).body(created);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        paymentService.deletePayment(id, academyId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/abono")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO', 'PROFESOR')")
    public ResponseEntity<PaymentDto> abono(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> body) {
        BigDecimal abono = body.get("abono");
        if (abono == null || abono.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().build();
        }
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(paymentService.abonarPayment(id, abono, academyId));
    }
}
