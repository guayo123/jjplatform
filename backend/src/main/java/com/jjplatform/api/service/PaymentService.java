package com.jjplatform.api.service;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.StudentRepository;
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

    public List<PaymentDto> getPaymentsByYear(Long academyId, int year) {
        return paymentRepository.findByAcademyIdAndYear(academyId, year).stream()
                .map(this::toDto)
                .toList();
    }

    public List<PaymentDto> getPaymentsByMonth(Long academyId, int month, int year) {
        return paymentRepository.findByAcademyIdAndMonthAndYear(academyId, month, year).stream()
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
        if (paymentRepository.existsByStudentIdAndMonthAndYear(
                dto.getStudentId(), dto.getMonth(), dto.getYear())) {
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

        BigDecimal expectedAmount = student.getPlans().stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()) && p.getPrice() != null)
                .map(p -> BigDecimal.valueOf(p.getPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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

        Payment payment = Payment.builder()
                .student(student)
                .academy(academy)
                .expectedAmount(expectedAmount.compareTo(BigDecimal.ZERO) > 0 ? expectedAmount : null)
                .amount(dto.getAmount())
                .discount(discount)
                .discountType(discountType)
                .month(dto.getMonth())
                .year(dto.getYear())
                .notes(dto.getNotes())
                .build();

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

        BigDecimal netExpected = computeNetExpected(payment);
        if (netExpected != null) {
            BigDecimal paidRounded = payment.getAmount().setScale(0, RoundingMode.HALF_UP);
            dto.setRemaining(netExpected.subtract(paidRounded).max(BigDecimal.ZERO));
        }

        return dto;
    }
}
