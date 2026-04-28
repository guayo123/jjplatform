package com.jjplatform.api.controller;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.service.PaymentService;
import com.jjplatform.api.service.SecurityHelper;
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
