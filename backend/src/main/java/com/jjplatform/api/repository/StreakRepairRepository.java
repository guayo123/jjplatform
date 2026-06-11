package com.jjplatform.api.repository;

import com.jjplatform.api.model.StreakRepair;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StreakRepairRepository extends JpaRepository<StreakRepair, Long> {

    List<StreakRepair> findByStudentId(Long studentId);
}
