package com.jjplatform.api.repository;

import com.jjplatform.api.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByAcademyIdAndMonthAndYear(Long academyId, Integer month, Integer year);
    List<Payment> findByAcademyIdAndYear(Long academyId, Integer year);
    List<Payment> findByStudentIdOrderByYearDescMonthDesc(Long studentId);
    boolean existsByStudentIdAndMonthAndYear(Long studentId, Integer month, Integer year);
}
