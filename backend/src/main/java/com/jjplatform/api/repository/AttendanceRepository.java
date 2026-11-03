package com.jjplatform.api.repository;

import com.jjplatform.api.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByStudentIdAndScheduleIdAndDate(Long studentId, Long scheduleId, LocalDate date);

    List<Attendance> findByStudentIdAndDate(Long studentId, LocalDate date);

    Optional<Attendance> findByStudentIdAndScheduleIsNullAndDate(Long studentId, LocalDate date);

    @Query("SELECT a FROM Attendance a JOIN FETCH a.student LEFT JOIN FETCH a.schedule "
            + "WHERE a.academy.id = :academyId AND a.date = :date ORDER BY a.checkedInAt")
    List<Attendance> findDayWithStudents(@Param("academyId") Long academyId, @Param("date") LocalDate date);

    @Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.schedule "
            + "WHERE a.student.id = :studentId ORDER BY a.date DESC, a.checkedInAt DESC")
    List<Attendance> findHistory(@Param("studentId") Long studentId);

    long countByStudentIdAndDateGreaterThanEqual(Long studentId, LocalDate from);

    boolean existsByAcademyIdAndDateLessThanEqual(Long academyId, LocalDate date);

    /** Last attendance date per student of the academy: rows of [studentId, maxDate]. */
    @Query("SELECT a.student.id, MAX(a.date) FROM Attendance a WHERE a.academy.id = :academyId GROUP BY a.student.id")
    List<Object[]> lastAttendancePerStudent(@Param("academyId") Long academyId);
}
