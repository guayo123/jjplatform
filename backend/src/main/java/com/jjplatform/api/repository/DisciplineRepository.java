package com.jjplatform.api.repository;

import com.jjplatform.api.model.Discipline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DisciplineRepository extends JpaRepository<Discipline, Long> {
    List<Discipline> findByAcademyIdOrderByNameAsc(Long academyId);

    /** Resolve a discipline by name within an academy (used to find-or-create "Kickboxing"). */
    Optional<Discipline> findFirstByAcademyIdAndNameIgnoreCase(Long academyId, String name);
}
