package com.jjplatform.api.repository;

import com.jjplatform.api.model.ConditioningSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConditioningSessionRepository extends JpaRepository<ConditioningSession, Long> {

    List<ConditioningSession> findByStudentIdOrderByDateDescCreatedAtDesc(Long studentId);
}
