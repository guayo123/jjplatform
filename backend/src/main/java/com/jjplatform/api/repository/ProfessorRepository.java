package com.jjplatform.api.repository;

import com.jjplatform.api.model.Professor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProfessorRepository extends JpaRepository<Professor, Long> {
    List<Professor> findByAcademyIdOrderByDisplayOrderAscNameAsc(Long academyId);
}
