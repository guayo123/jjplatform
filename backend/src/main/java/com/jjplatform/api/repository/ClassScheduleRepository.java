package com.jjplatform.api.repository;

import com.jjplatform.api.model.ClassSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassScheduleRepository extends JpaRepository<ClassSchedule, Long> {
    List<ClassSchedule> findByAcademyIdOrderByDayOfWeekAscStartTimeAsc(Long academyId);
}
