package com.jjplatform.api.repository;

import com.jjplatform.api.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByAcademyIdOrderByNameAsc(Long academyId);
    List<Student> findByAcademyIdAndActiveTrue(Long academyId);

    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.plans WHERE s.id = :id")
    Optional<Student> findByIdWithPlans(@Param("id") Long id);

    /** Used during student self-registration; RUT is matched in-memory after normalization (format-insensitive). */
    List<Student> findByEmailIgnoreCase(String email);

    /** Resolves the student records backing a logged-in portal user (one per academy they belong to). */
    List<Student> findByUser_Id(Long userId);

    /** Records the login owns, or is a guardian (apoderado) of — what the portal lets it switch between. */
    @Query("SELECT DISTINCT s FROM Student s LEFT JOIN s.guardians g WHERE s.user.id = :userId OR g.id = :userId ORDER BY s.id")
    List<Student> findAccessibleByUser(@Param("userId") Long userId);

    boolean existsByIdAndGuardians_Id(Long studentId, Long userId);

    /** Students that name this email as their guardian (stored lower-cased); RUT is matched in-memory after normalization. */
    List<Student> findByGuardianEmail(String guardianEmail);
}
