package com.jjplatform.api.repository;

import com.jjplatform.api.model.StudentDiscipline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentDisciplineRepository extends JpaRepository<StudentDiscipline, Long> {
    List<StudentDiscipline> findByStudentIdOrderByCreatedAtAsc(Long studentId);
    List<StudentDiscipline> findByStudentIdInAndActiveTrue(List<Long> studentIds);
    Optional<StudentDiscipline> findByStudentIdAndDisciplineId(Long studentId, Long disciplineId);
    boolean existsByStudentIdAndDisciplineId(Long studentId, Long disciplineId);
}
