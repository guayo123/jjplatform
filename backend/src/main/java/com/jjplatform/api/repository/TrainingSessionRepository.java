package com.jjplatform.api.repository;

import com.jjplatform.api.model.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    List<TrainingSession> findByStudentIdOrderByDateDescCreatedAtDesc(Long studentId);

    List<TrainingSession> findByStudentIdAndDateGreaterThanEqual(Long studentId, LocalDate from);

    /** All sessions in an academy since {@code from} — feeds the training leaderboard. */
    List<TrainingSession> findByStudentAcademyIdAndDateGreaterThanEqual(Long academyId, LocalDate from);
}
