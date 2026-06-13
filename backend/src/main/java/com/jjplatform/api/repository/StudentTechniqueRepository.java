package com.jjplatform.api.repository;

import com.jjplatform.api.model.StudentTechnique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface StudentTechniqueRepository extends JpaRepository<StudentTechnique, Long> {

    List<StudentTechnique> findByStudentId(Long studentId);

    Optional<StudentTechnique> findByStudentIdAndTechniqueId(Long studentId, Long techniqueId);

    boolean existsByStudentIdAndTechniqueId(Long studentId, Long techniqueId);

    @Transactional
    void deleteByStudentIdAndTechniqueId(Long studentId, Long techniqueId);

    @Transactional
    void deleteByTechniqueId(Long techniqueId);
}
