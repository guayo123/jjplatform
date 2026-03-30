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

        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (!student.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Student does not belong to this academy");
        }

        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Payment payment = Payment.builder()
                .student(student)
                .academy(academy)
                .amount(dto.getAmount())
                .month(dto.getMonth())
                .year(dto.getYear())
                .notes(dto.getNotes())
                .build();

        payment = paymentRepository.save(payment);
        return toDto(payment);
    }

    private PaymentDto toDto(Payment payment) {
        PaymentDto dto = new PaymentDto();
        dto.setId(payment.getId());
        dto.setStudentId(payment.getStudent().getId());
        dto.setStudentName(payment.getStudent().getName());
        dto.setAmount(payment.getAmount());
        dto.setMonth(payment.getMonth());
        dto.setYear(payment.getYear());
        dto.setNotes(payment.getNotes());
        dto.setPaidAt(payment.getPaidAt() != null ? payment.getPaidAt().toString() : null);
        return dto;
    }
}
