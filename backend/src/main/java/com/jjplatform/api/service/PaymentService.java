package com.jjplatform.api.service;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;
    private final UserRepository userRepository;

    private static final String PENDING = "PENDING_CONFIRMATION";

    /** An online checkout not confirmed within this window is shown as "not completed". */
    public static final java.time.Duration CHECKOUT_TIMEOUT = java.time.Duration.ofMinutes(30);
    public static final String ONLINE_IN_PROGRESS = "IN_PROGRESS";
    public static final String ONLINE_EXPIRED = "EXPIRED";
    public static final String ONLINE_REJECTED = "REJECTED";

    /**
     * State of a pending online checkout for the portal: IN_PROGRESS, EXPIRED (abandoned / timed out)
     * or REJECTED by the gateway. Null when the payment isn't a pending checkout.
     */
    public static String onlineState(Payment p) {
        if (!PENDING.equals(p.getStatus())) return null;
        if (ONLINE_REJECTED.equals(p.getGatewayStatus())) return ONLINE_REJECTED;
        java.time.LocalDateTime started = p.getCheckoutStartedAt() != null ? p.getCheckoutStartedAt() : p.getPaidAt();
        if (started == null || started.plus(CHECKOUT_TIMEOUT).isBefore(java.time.LocalDateTime.now())) return ONLINE_EXPIRED;
        return ONLINE_IN_PROGRESS;
    }

    /** Staff views only list confirmed money: an unfinished online checkout is not a payment yet. */
    public List<PaymentDto> getPaymentsByYear(Long academyId, int year) {
        return paymentRepository.findByAcademyIdAndYear(academyId, year).stream()
                .filter(p -> !PENDING.equals(p.getStatus()))
                .map(this::toDto)
                .toList();
    }

    public List<PaymentDto> getPaymentsByMonth(Long academyId, int month, int year) {
        return paymentRepository.findByAcademyIdAndMonthAndYear(academyId, month, year).stream()
                .filter(p -> !PENDING.equals(p.getStatus()))
                .map(this::toDto)
                .toList();
    }

    public List<PaymentDto> getPaymentsByStudent(Long studentId) {
        return paymentRepository.findByStudentIdOrderByYearDescMonthDesc(studentId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public PaymentDto createPayment(PaymentDto dto, Long academyId) {
        var existing = paymentRepository.findByStudentIdAndMonthAndYear(
                dto.getStudentId(), dto.getMonth(), dto.getYear());
        if (existing.isPresent() && !PENDING.equals(existing.get().getStatus())) {
            throw new IllegalArgumentException(
                    "Payment already exists for this student in the specified month");
        }

        Student student = studentRepository.findByIdWithPlans(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (!student.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Student does not belong to this academy");
        }

        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        BigDecimal expectedAmount = computeExpected(student);

        BigDecimal discount = dto.getDiscount() != null ? dto.getDiscount() : BigDecimal.ZERO;
        String discountType = dto.getDiscountType() != null ? dto.getDiscountType() : "AMOUNT";

        if (expectedAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal netExpected = "PERCENT".equals(discountType)
                    ? expectedAmount.multiply(BigDecimal.ONE.subtract(discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))).setScale(0, RoundingMode.HALF_UP)
                    : expectedAmount.subtract(discount).setScale(0, RoundingMode.HALF_UP);
            BigDecimal amountRounded = dto.getAmount().setScale(0, RoundingMode.HALF_UP);
            if (amountRounded.compareTo(netExpected) > 0) {
                throw new IllegalArgumentException("El monto pagado supera el total esperado");
            }
        }

        // Staff recording by hand over an unfinished online checkout: reuse that row (same id) so a late
        // gateway confirmation still finds it and is reported as a double payment instead of being lost.
        Payment payment = existing.orElseGet(() -> Payment.builder().student(student).academy(academy).build());
        payment.setExpectedAmount(expectedAmount.compareTo(BigDecimal.ZERO) > 0 ? expectedAmount : null);
        payment.setAmount(dto.getAmount());
        payment.setDiscount(discount);
        payment.setDiscountType(discountType);
        payment.setMonth(dto.getMonth());
        payment.setYear(dto.getYear());
        payment.setNotes(dto.getNotes());
        if (existing.isPresent()) {
            payment.setStatus("PAID");
            payment.setMethod(null);
            payment.setGatewayStatus(null);
            payment.setPaidBy(null);
            payment.setPaidAt(java.time.LocalDateTime.now());
        }

        payment = paymentRepository.save(payment);
        return toDto(payment);
    }

    @Transactional
    public void deletePayment(Long paymentId, Long academyId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (!payment.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Payment does not belong to this academy");
        }
        paymentRepository.delete(payment);
    }

    @Transactional
    public PaymentDto abonarPayment(Long paymentId, BigDecimal abono, Long academyId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        if (!payment.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Payment does not belong to this academy");
        }

        BigDecimal netExpected = computeNetExpected(payment);
        if (netExpected != null) {
            BigDecimal newTotal = payment.getAmount().add(abono).setScale(0, RoundingMode.HALF_UP);
            if (newTotal.compareTo(netExpected) > 0) {
                throw new IllegalArgumentException("El abono supera el monto pendiente");
            }
        }

        payment.setAmount(payment.getAmount().add(abono));
        payment = paymentRepository.save(payment);
        return toDto(payment);
    }

    /** Sum of the student's active plan prices — the full monthly fee. */
    private BigDecimal computeExpected(Student student) {
        return student.getPlans().stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()) && p.getPrice() != null)
                .map(p -> BigDecimal.valueOf(p.getPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Returns the student's pending (or already paid) payment for the month, creating a
     * PENDING_CONFIRMATION row when none exists. Used when initiating an online (Khipu/MP)
     * payment so the webhook can reconcile by the payment id. Throws when the month is already paid.
     */
    @Transactional
    public Payment getOrCreatePendingPayment(Long studentId, Long academyId, int month, int year, String method, Long payerUserId) {
        User payer = payerUserId != null ? userRepository.getReferenceById(payerUserId) : null;
        Student student = studentRepository.findByIdWithPlans(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (!student.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Student does not belong to this academy");
        }

        Payment existing = paymentRepository.findByStudentIdAndMonthAndYear(studentId, month, year).orElse(null);
        if (existing != null) {
            if ("PAID".equals(existing.getStatus())) {
                throw new IllegalArgumentException("Este mes ya está pagado.");
            }
            // A new attempt charges the current plan prices, even if they changed since the last attempt.
            BigDecimal current = computeExpected(student);
            if (current.compareTo(BigDecimal.ZERO) > 0) {
                existing.setExpectedAmount(current);
                existing.setAmount(current);
            }
            existing.setMethod(method);
            existing.setPaidBy(payer);
            existing.setCheckoutStartedAt(java.time.LocalDateTime.now());
            existing.setGatewayStatus(null);
            return paymentRepository.save(existing);
        }

        BigDecimal expected = computeExpected(student);
        if (expected.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("No hay un plan con precio configurado para cobrar en línea.");
        }

        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Payment payment = Payment.builder()
                .student(student)
                .academy(academy)
                .expectedAmount(expected)
                .amount(expected)
                .discount(BigDecimal.ZERO)
                .discountType("AMOUNT")
                .month(month)
                .year(year)
                .status("PENDING_CONFIRMATION")
                .method(method)
                .paidBy(payer)
                .checkoutStartedAt(java.time.LocalDateTime.now())
                .build();
        return paymentRepository.save(payment);
    }

    /**
     * Marks a payment PAID after a verified gateway notification. Idempotent: returns true only for
     * the call that actually confirmed it (used to send the "payment received" emails exactly once).
     */
    @Transactional
    public boolean markPaidByGateway(Long paymentId, String method, String gatewayPaymentId) {
        return paymentRepository.markPaidIfPending(paymentId, method, gatewayPaymentId, java.time.LocalDateTime.now()) == 1;
    }

    /** The gateway rejected the latest attempt: shown to the student so they can retry. No-op once paid. */
    @Transactional
    public void markGatewayRejected(Long paymentId) {
        paymentRepository.findById(paymentId).ifPresent(p -> {
            if ("PAID".equals(p.getStatus())) return;
            p.setGatewayStatus(ONLINE_REJECTED);
            paymentRepository.save(p);
        });
    }

    /** True only the first time staff are alerted about this gateway payment for this row. */
    @Transactional
    public boolean claimDuplicateAlert(Long paymentId, String gatewayPaymentId) {
        return paymentRepository.claimDuplicateAlert(paymentId, gatewayPaymentId) == 1;
    }

    private BigDecimal computeNetExpected(Payment payment) {
        if (payment.getExpectedAmount() == null) return null;
        BigDecimal expected = payment.getExpectedAmount();
        BigDecimal discount = payment.getDiscount() != null ? payment.getDiscount() : BigDecimal.ZERO;
        if ("PERCENT".equals(payment.getDiscountType())) {
            BigDecimal factor = BigDecimal.ONE.subtract(discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            return expected.multiply(factor).setScale(0, RoundingMode.HALF_UP);
        }
        return expected.subtract(discount).setScale(0, RoundingMode.HALF_UP);
    }

    private PaymentDto toDto(Payment payment) {
        PaymentDto dto = new PaymentDto();
        dto.setId(payment.getId());
        dto.setStudentId(payment.getStudent().getId());
        dto.setStudentName(payment.getStudent().getName());
        dto.setExpectedAmount(payment.getExpectedAmount());
        dto.setAmount(payment.getAmount());
        dto.setDiscount(payment.getDiscount());
        dto.setDiscountType(payment.getDiscountType());
        dto.setMonth(payment.getMonth());
        dto.setYear(payment.getYear());
        dto.setNotes(payment.getNotes());
        dto.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt().toString() : null);
        dto.setStatus(payment.getStatus());
        dto.setMethod(payment.getMethod());
        dto.setProofUrl(payment.getProofUrl());
        dto.setOnlineState(onlineState(payment));
        if ("PAID".equals(payment.getStatus()) && payment.getMethod() != null && payment.getGatewayPaymentId() != null) {
            dto.setOperationId(payment.getGatewayPaymentId());
        }
        User payer = payment.getPaidBy();
        if (payer != null) {
            User owner = payment.getStudent().getUser();
            dto.setPaidByEmail(payer.getEmail());
            dto.setPaidByGuardian(owner == null || !owner.getId().equals(payer.getId()));
        }

        BigDecimal netExpected = computeNetExpected(payment);
        if (netExpected != null) {
            BigDecimal paidRounded = payment.getAmount().setScale(0, RoundingMode.HALF_UP);
            dto.setRemaining(netExpected.subtract(paidRounded).max(BigDecimal.ZERO));
        }

        return dto;
    }
}
