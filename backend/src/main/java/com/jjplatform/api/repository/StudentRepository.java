package com.jjplatform.api.repository;

import com.jjplatform.api.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByAcademyIdOrderByNameAsc(Long academyId);
    List<Student> findByAcademyIdAndActiveTrue(Long academyId);
}
