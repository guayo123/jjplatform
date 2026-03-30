package com.jjplatform.api.controller;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.service.PaymentService;
import com.jjplatform.api.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO')")
    public ResponseEntity<PaymentDto> create(@Valid @RequestBody PaymentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        PaymentDto created = paymentService.createPayment(dto, academyId);
        return ResponseEntity.status(201).body(created);
    }
}
