package com.jjplatform.api.repository;

import com.jjplatform.api.model.DisciplineAgeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisciplineAgeCategoryRepository extends JpaRepository<DisciplineAgeCategory, Long> {
    List<DisciplineAgeCategory> findByDisciplineIdOrderByDisplayOrderAsc(Long disciplineId);
}
