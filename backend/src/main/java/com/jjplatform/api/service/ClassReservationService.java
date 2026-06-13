package com.jjplatform.api.service;

import com.jjplatform.api.dto.ReservationRosterDto;
import com.jjplatform.api.dto.UpcomingClassDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.ClassReservation;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.ClassReservationRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Class reservations: students reserve a spot in a dated occurrence of a recurring weekly
 * {@link ClassSchedule}, bounded by the schedule's capacity. Occurrences are derived on the fly
 * from the weekly grid (no per-date rows) — only the reservations are persisted.
 */
@Service
@RequiredArgsConstructor
public class ClassReservationService {

    /** Spanish day names stored on ClassSchedule.dayOfWeek → java DayOfWeek. */
    private static final Map<String, DayOfWeek> DAY_MAP = Map.of(
            "Lunes", DayOfWeek.MONDAY,
            "Martes", DayOfWeek.TUESDAY,
            "Miércoles", DayOfWeek.WEDNESDAY,
            "Jueves", DayOfWeek.THURSDAY,
            "Viernes", DayOfWeek.FRIDAY,
            "Sábado", DayOfWeek.SATURDAY,
            "Domingo", DayOfWeek.SUNDAY);

    private static final int WINDOW_DAYS = 7;

    private final ClassScheduleRepository scheduleRepository;
    private final ClassReservationRepository reservationRepository;
    private final StudentRepository studentRepository;

    /** Upcoming class occurrences for the next week in the student's academy, with reservation state. */
    @Transactional(readOnly = true)
    public List<UpcomingClassDto> getUpcoming(Long studentId, Long academyId) {
        List<ClassSchedule> schedules = scheduleRepository.findByAcademyIdOrderByDayOfWeekAscStartTimeAsc(academyId);
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        List<UpcomingClassDto> out = new ArrayList<>();
        for (int offset = 0; offset <= WINDOW_DAYS; offset++) {
            LocalDate date = today.plusDays(offset);
            for (ClassSchedule s : schedules) {
                if (DAY_MAP.get(s.getDayOfWeek()) != date.getDayOfWeek()) continue;
                if (!date.atTime(s.getStartTime()).isAfter(now)) continue; // already started/past

                long reserved = reservationRepository.countByScheduleIdAndClassDate(s.getId(), date);
                boolean mine = reservationRepository.existsByScheduleIdAndStudentIdAndClassDate(s.getId(), studentId, date);
                Integer spotsLeft = s.getCapacity() == null ? null : Math.max(0, s.getCapacity() - (int) reserved);
                Professor prof = s.getProfessor() != null ? s.getProfessor()
                        : (s.getPlan() != null ? s.getPlan().getProfessor() : null);

                out.add(UpcomingClassDto.builder()
                        .scheduleId(s.getId())
                        .classDate(date.toString())
                        .dayOfWeek(s.getDayOfWeek())
                        .startTime(s.getStartTime().toString())
                        .endTime(s.getEndTime().toString())
                        .className(s.getClassName())
                        .professorName(prof != null ? prof.getName() : null)
                        .capacity(s.getCapacity())
                        .reservedCount((int) reserved)
                        .spotsLeft(spotsLeft)
                        .mineReserved(mine)
                        .build());
            }
        }
        out.sort((a, b) -> {
            int c = a.getClassDate().compareTo(b.getClassDate());
            return c != 0 ? c : a.getStartTime().compareTo(b.getStartTime());
        });
        return out;
    }

    @Transactional
    public void reserve(Long studentId, Long academyId, Long scheduleId, LocalDate date) {
        ClassSchedule schedule = requireSchedule(scheduleId, academyId);
        if (DAY_MAP.get(schedule.getDayOfWeek()) != date.getDayOfWeek()) {
            throw new IllegalArgumentException("La fecha no corresponde al día de esta clase.");
        }
        if (!date.atTime(schedule.getStartTime()).isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Esta clase ya comenzó.");
        }
        if (reservationRepository.existsByScheduleIdAndStudentIdAndClassDate(scheduleId, studentId, date)) {
            return; // idempotent
        }
        if (schedule.getCapacity() != null
                && reservationRepository.countByScheduleIdAndClassDate(scheduleId, date) >= schedule.getCapacity()) {
            throw new IllegalArgumentException("La clase está llena.");
        }
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        reservationRepository.save(ClassReservation.builder()
                .schedule(schedule)
                .student(student)
                .classDate(date)
                .build());
    }

    @Transactional
    public void cancel(Long studentId, Long academyId, Long scheduleId, LocalDate date) {
        requireSchedule(scheduleId, academyId);
        reservationRepository.deleteByScheduleIdAndStudentIdAndClassDate(scheduleId, studentId, date);
    }

    /** Admin roster: who reserved a given class occurrence. */
    @Transactional(readOnly = true)
    public List<ReservationRosterDto> roster(Long academyId, Long scheduleId, LocalDate date) {
        requireSchedule(scheduleId, academyId);
        return reservationRepository.findByScheduleIdAndClassDateOrderByCreatedAtAsc(scheduleId, date).stream()
                .map(r -> {
                    Student s = r.getStudent();
                    return ReservationRosterDto.builder()
                            .studentId(s.getId())
                            .name(s.getName())
                            .photoUrl(s.getPhotoUrl())
                            .belt(s.getBelt())
                            .build();
                })
                .toList();
    }

    private ClassSchedule requireSchedule(Long scheduleId, Long academyId) {
        ClassSchedule s = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase no encontrada"));
        if (!s.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Clase no encontrada");
        }
        return s;
    }
}
