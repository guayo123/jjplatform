package com.jjplatform.api.repository;

import com.jjplatform.api.model.WeightEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightEntryRepository extends JpaRepository<WeightEntry, Long> {

    List<WeightEntry> findByStudentIdOrderByDateAsc(Long studentId);

    Optional<WeightEntry> findByStudentIdAndDate(Long studentId, LocalDate date);

    void deleteByStudentIdAndDate(Long studentId, LocalDate date);
}
