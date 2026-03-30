package com.jjplatform.api.repository;

import com.jjplatform.api.model.Academy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AcademyRepository extends JpaRepository<Academy, Long> {
    Optional<Academy> findByUserId(Long userId);
}
