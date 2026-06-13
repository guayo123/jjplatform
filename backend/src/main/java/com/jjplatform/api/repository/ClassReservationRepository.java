package com.jjplatform.api.repository;

import com.jjplatform.api.model.ClassReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface ClassReservationRepository extends JpaRepository<ClassReservation, Long> {

    long countByScheduleIdAndClassDate(Long scheduleId, LocalDate classDate);

    boolean existsByScheduleIdAndStudentIdAndClassDate(Long scheduleId, Long studentId, LocalDate classDate);

    List<ClassReservation> findByScheduleIdAndClassDateOrderByCreatedAtAsc(Long scheduleId, LocalDate classDate);

    List<ClassReservation> findByStudentIdAndClassDateGreaterThanEqual(Long studentId, LocalDate from);

    @Transactional
    void deleteByScheduleIdAndStudentIdAndClassDate(Long scheduleId, Long studentId, LocalDate classDate);
}
