package com.jjplatform.api.repository;

import com.jjplatform.api.model.Discipline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisciplineRepository extends JpaRepository<Discipline, Long> {
    List<Discipline> findByAcademyIdOrderByNameAsc(Long academyId);
}
