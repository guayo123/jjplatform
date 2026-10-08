package com.jjplatform.api.repository;

import com.jjplatform.api.model.ClassSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, Long> {
    /** Clases vigentes de la academia (las dadas de baja no se listan). */
    List<ClassSchedule> findByAcademyIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(Long academyId);
}
