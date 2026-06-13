package com.jjplatform.api.repository;

import com.jjplatform.api.model.Technique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TechniqueRepository extends JpaRepository<Technique, Long> {

    List<Technique> findByDisciplineBeltIdOrderByDisplayOrderAsc(Long beltId);

    List<Technique> findByDisciplineBeltIdAndActiveTrueOrderByDisplayOrderAsc(Long beltId);

    long countByDisciplineBeltId(Long beltId);

    @Transactional
    void deleteByDisciplineBeltId(Long beltId);
}
