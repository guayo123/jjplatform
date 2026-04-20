package com.jjplatform.api.repository;

import com.jjplatform.api.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findByAcademyIdAndActiveTrueOrderByDisplayOrderAscIdAsc(Long academyId);
    List<Plan> findByAcademyIdOrderByDisplayOrderAscIdAsc(Long academyId);
}
