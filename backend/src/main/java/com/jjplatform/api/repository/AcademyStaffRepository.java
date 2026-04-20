package com.jjplatform.api.repository;

import com.jjplatform.api.model.AcademyStaff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AcademyStaffRepository extends JpaRepository<AcademyStaff, Long> {
    List<AcademyStaff> findByAcademyId(Long academyId);
    boolean existsByAcademyIdAndUserId(Long academyId, Long userId);
    Optional<AcademyStaff> findByAcademyIdAndUserId(Long academyId, Long userId);
}
