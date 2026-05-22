package com.jjplatform.api.repository;

import com.jjplatform.api.model.CompetitionResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompetitionResultRepository extends JpaRepository<CompetitionResult, Long> {
    List<CompetitionResult> findByStudentDisciplineIdOrderByDateDesc(Long studentDisciplineId);
}
