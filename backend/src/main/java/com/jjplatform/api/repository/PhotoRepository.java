package com.jjplatform.api.repository;

import com.jjplatform.api.model.Photo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhotoRepository extends JpaRepository<Photo, Long> {
    List<Photo> findByAcademyIdOrderByCreatedAtDesc(Long academyId);
}
