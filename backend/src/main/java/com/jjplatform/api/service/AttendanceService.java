package com.jjplatform.api.service;

import com.jjplatform.api.dto.AttendanceDayDto;
import com.jjplatform.api.dto.AttendanceDto;
import com.jjplatform.api.dto.CheckinInfoDto;
import com.jjplatform.api.dto.ReservationRosterDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Attendance;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.AttendanceRepository;
import com.jjplatform.api.repository.ClassReservationRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Dojo attendance by QR. The academy prints one QR holding a secret code (/asistencia/{code}); a logged-in
 * student scans it and is marked present in the class running at that moment (from 30 min before start to
 * the end), or in a free session when none is. Staff can also mark/unmark by hand. Unrelated to belts.
 */
@Service
@RequiredArgsConstructor
public class AttendanceService {

    /** A class accepts check-ins from this long before it starts until it ends. */
    static final int EARLY_MINUTES = 30;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AttendanceRepository attendanceRepository;
    private final AcademyRepository academyRepository;
    private final ClassScheduleRepository scheduleRepository;
    private final ClassReservationRepository reservationRepository;
    private final StudentRepository studentRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final TrainingService trainingService;

    // --- QR code ----------------------------------------------------------------

    @Transactional
    public String getOrCreateCode(Long academyId) {
        Academy academy = requireAcademy(academyId);
        if (academy.getCheckinCode() == null) {
            academy.setCheckinCode(newCode());
            academyRepository.save(academy);
        }
        return academy.getCheckinCode();
    }

    /** New code: QRs printed before stop working (e.g. a photo of it went around WhatsApp). */
    @Transactional
    public String regenerateCode(Long academyId) {
        Academy academy = requireAcademy(academyId);
        academy.setCheckinCode(newCode());
        academyRepository.save(academy);
        return academy.getCheckinCode();
    }

    // --- Student check-in -------------------------------------------------------

    @Transactional(readOnly = true)
    public CheckinInfoDto checkinInfo(String code, Long userId) {
        Academy academy = requireAcademyByCode(code);
        List<Student> profiles = profilesIn(academy.getId(), userId);
        LocalDate today = LocalDate.now();

        List<CheckinInfoDto.ClassOption> classes = runningClasses(academy.getId(), LocalDateTime.now()).stream()
                .map(s -> CheckinInfoDto.ClassOption.builder()
                        .scheduleId(s.getId())
                        .className(s.getClassName())
                        .startTime(s.getStartTime().toString())
                        .endTime(s.getEndTime().toString())
                        .professorName(professorName(s))
                        .build())
                .toList();

        List<CheckinInfoDto.Profile> out = profiles.stream()
                .map(st -> CheckinInfoDto.Profile.builder()
                        .studentId(st.getId())
                        .name(st.getName())
                        .photoUrl(st.getPhotoUrl())
                        .self(st.getUser() != null && st.getUser().getId().equals(userId))
                        .checkedIn(checkedInToday(st.getId(), today))
                        .build())
                .toList();

        return CheckinInfoDto.builder()
                .academyId(academy.getId())
                .academyName(academy.getName())
                .academyLogoUrl(academy.getLogoUrl())
                .classes(classes)
                .profiles(out)
                .build();
    }

    /**
     * Marks the chosen profiles present. scheduleId null = free session, only allowed when no class is
     * running; a given class must be running now. Idempotent per student/class/day.
     */
    @Transactional
    public List<AttendanceDto> checkin(String code, Long userId, Collection<Long> studentIds, Long scheduleId) {
        Academy academy = requireAcademyByCode(code);
        if (studentIds == null || studentIds.isEmpty()) {
            throw new IllegalArgumentException("Elige quién llegó.");
        }
        Map<Long, Student> allowed = profilesIn(academy.getId(), userId).stream()
                .collect(Collectors.toMap(Student::getId, s -> s));

        List<ClassSchedule> running = runningClasses(academy.getId(), LocalDateTime.now());
        ClassSchedule schedule = null;
        if (scheduleId != null) {
            schedule = running.stream().filter(s -> s.getId().equals(scheduleId)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Esa clase no está en horario ahora."));
        } else if (!running.isEmpty()) {
            throw new IllegalArgumentException("Elige la clase a la que llegaste.");
        }

        List<AttendanceDto> out = new ArrayList<>();
        for (Long id : new java.util.LinkedHashSet<>(studentIds)) {
            Student st = allowed.get(id);
            if (st == null) throw new ResourceNotFoundException("Alumno no encontrado");
            out.add(mark(academy, st, schedule, LocalDate.now(), Attendance.Source.QR));
        }
        return out;
    }

    /**
     * After check-in the student may log the session in their training journal: a basic entry (date,
     * discipline and length of the class) they can complete later. Skips a day that already has one.
     * Returns how many entries were created.
     */
    @Transactional
    public int logToJournal(Long userId, Collection<Long> attendanceIds) {
        int created = 0;
        for (Long id : attendanceIds) {
            Attendance a = attendanceRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada"));
            Student st = a.getStudent();
            if (!canAccess(st, userId)) throw new ResourceNotFoundException("Asistencia no encontrada");
            if (trainingSessionRepository.existsByStudentIdAndDate(st.getId(), a.getDate())) continue;

            TrainingSessionDto dto = new TrainingSessionDto();
            dto.setDate(a.getDate());
            ClassSchedule s = a.getSchedule();
            if (s != null) {
                if (s.getPlan() != null && s.getPlan().getDiscipline() != null) {
                    dto.setDisciplineId(s.getPlan().getDiscipline().getId());
                }
                long minutes = Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
                if (minutes > 0) dto.setDurationMin((int) minutes);
                dto.setNotes(s.getClassName());
            } else {
                dto.setModality("OPEN_MAT");
            }
            trainingService.create(st, dto);
            created++;
        }
        return created;
    }

    // --- Staff ------------------------------------------------------------------

    /** Every class of the weekly grid on that date with its attendees and no-shows, plus free sessions. */
    @Transactional(readOnly = true)
    public AttendanceDayDto day(Long academyId, LocalDate date) {
        List<Attendance> rows = attendanceRepository.findDayWithStudents(academyId, date);
        Map<Long, List<AttendanceDto>> bySchedule = new HashMap<>();
        List<AttendanceDto> free = new ArrayList<>();
        for (Attendance a : rows) {
            AttendanceDto dto = toDto(a, null);
            if (a.getSchedule() == null) free.add(dto);
            else bySchedule.computeIfAbsent(a.getSchedule().getId(), k -> new ArrayList<>()).add(dto);
        }

        Map<Long, ClassSchedule> classes = new LinkedHashMap<>();
        scheduleRepository.findByAcademyIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(academyId).stream()
                .filter(Offering::scheduleOn)
                .filter(s -> ClassReservationService.DAY_MAP.get(s.getDayOfWeek()) == date.getDayOfWeek())
                .forEach(s -> classes.put(s.getId(), s));
        // A class retired later still shows on days it had attendance.
        for (Attendance a : rows) {
            if (a.getSchedule() != null) classes.putIfAbsent(a.getSchedule().getId(), a.getSchedule());
        }

        List<AttendanceDayDto.ClassDay> out = classes.values().stream()
                .sorted((x, y) -> x.getStartTime().compareTo(y.getStartTime()))
                .map(s -> {
                    List<AttendanceDto> attendees = bySchedule.getOrDefault(s.getId(), List.of());
                    Set<Long> came = attendees.stream().map(AttendanceDto::getStudentId).collect(Collectors.toSet());
                    List<ReservationRosterDto> noShows = reservationRepository
                            .findByScheduleIdAndClassDateOrderByCreatedAtAsc(s.getId(), date).stream()
                            .map(r -> r.getStudent())
                            .filter(st -> !came.contains(st.getId()))
                            .map(st -> ReservationRosterDto.builder()
                                    .studentId(st.getId()).name(st.getName())
                                    .photoUrl(st.getPhotoUrl()).belt(st.getBelt()).build())
                            .toList();
                    return AttendanceDayDto.ClassDay.builder()
                            .scheduleId(s.getId())
                            .className(s.getClassName())
                            .startTime(s.getStartTime().toString())
                            .endTime(s.getEndTime().toString())
                            .professorName(professorName(s))
                            .capacity(s.getCapacity())
                            .attendees(attendees)
                            .noShows(noShows)
                            .build();
                })
                .toList();

        return AttendanceDayDto.builder().date(date.toString()).classes(out).free(free).build();
    }

    /** Staff marks a student present by hand (no phone, forgot to scan…). scheduleId null = free session. */
    @Transactional
    public AttendanceDto markManual(Long academyId, Long studentId, Long scheduleId, LocalDate date) {
        Academy academy = requireAcademy(academyId);
        Student st = studentRepository.findById(studentId)
                .filter(s -> s.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        ClassSchedule schedule = null;
        if (scheduleId != null) {
            schedule = scheduleRepository.findById(scheduleId)
                    .filter(s -> s.getAcademy().getId().equals(academyId))
                    .orElseThrow(() -> new ResourceNotFoundException("Clase no encontrada"));
        }
        if (date.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("No se puede marcar asistencia en una fecha futura.");
        }
        return mark(academy, st, schedule, date, Attendance.Source.MANUAL);
    }

    @Transactional
    public void delete(Long academyId, Long attendanceId) {
        Attendance a = attendanceRepository.findById(attendanceId)
                .filter(x -> x.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada"));
        attendanceRepository.delete(a);
    }

    /** A student's attendance history (admin student detail). */
    @Transactional(readOnly = true)
    public Map<String, Object> history(Long academyId, Long studentId) {
        Student st = studentRepository.findById(studentId)
                .filter(s -> s.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        LocalDate today = LocalDate.now();
        List<AttendanceDto> items = attendanceRepository.findHistory(st.getId()).stream()
                .limit(100).map(a -> toDto(a, null)).toList();
        Map<String, Object> out = new HashMap<>();
        out.put("thisMonth", attendanceRepository.countByStudentIdAndDateGreaterThanEqual(st.getId(), today.withDayOfMonth(1)));
        out.put("last30", attendanceRepository.countByStudentIdAndDateGreaterThanEqual(st.getId(), today.minusDays(29)));
        out.put("items", items);
        return out;
    }

    // --- internals --------------------------------------------------------------

    private AttendanceDto mark(Academy academy, Student st, ClassSchedule schedule, LocalDate date, Attendance.Source source) {
        var existing = schedule == null
                ? attendanceRepository.findByStudentIdAndScheduleIsNullAndDate(st.getId(), date)
                : attendanceRepository.findByStudentIdAndScheduleIdAndDate(st.getId(), schedule.getId(), date);
        if (existing.isPresent()) return toDto(existing.get(), false);
        try {
            Attendance a = attendanceRepository.saveAndFlush(Attendance.builder()
                    .academy(academy)
                    .student(st)
                    .schedule(schedule)
                    .date(date)
                    .checkedInAt(LocalDateTime.now())
                    .source(source)
                    .build());
            return toDto(a, true);
        } catch (DataIntegrityViolationException race) {
            // Double tap: the other request won; report it as already marked.
            throw new IllegalStateException("La asistencia ya estaba registrada.");
        }
    }

    /** Classes of the academy accepting check-ins at {@code now}. */
    List<ClassSchedule> runningClasses(Long academyId, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        return scheduleRepository.findByAcademyIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(academyId).stream()
                .filter(Offering::scheduleOn)
                .filter(s -> ClassReservationService.DAY_MAP.get(s.getDayOfWeek()) == today.getDayOfWeek())
                .filter(s -> {
                    LocalDateTime opens = today.atTime(s.getStartTime()).minusMinutes(EARLY_MINUTES);
                    LocalDateTime closes = today.atTime(s.getEndTime());
                    return !now.isBefore(opens) && !now.isAfter(closes);
                })
                .sorted((x, y) -> x.getStartTime().compareTo(y.getStartTime()))
                .toList();
    }

    private List<Long> checkedInToday(Long studentId, LocalDate today) {
        return attendanceRepository.findByStudentIdAndDate(studentId, today).stream()
                .map(a -> a.getSchedule() == null ? 0L : a.getSchedule().getId())
                .toList();
    }

    /** Active records this login can mark present in the academy: their own plus their wards'. */
    private List<Student> profilesIn(Long academyId, Long userId) {
        List<Student> list = studentRepository.findAccessibleByUser(userId).stream()
                .filter(s -> s.getAcademy().getId().equals(academyId))
                .filter(s -> !Boolean.FALSE.equals(s.getActive()))
                .toList();
        if (list.isEmpty()) {
            throw new IllegalArgumentException("Tu cuenta no está inscrita en esta academia.");
        }
        return list;
    }

    private boolean canAccess(Student st, Long userId) {
        return (st.getUser() != null && st.getUser().getId().equals(userId))
                || studentRepository.existsByIdAndGuardians_Id(st.getId(), userId);
    }

    private Academy requireAcademy(Long academyId) {
        return academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academia no encontrada"));
    }

    private Academy requireAcademyByCode(String code) {
        return academyRepository.findByCheckinCode(code == null ? "" : code.trim().toUpperCase())
                .filter(a -> !Boolean.FALSE.equals(a.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Este código QR no es válido. Pide a tu academia el QR actualizado."));
    }

    private static String professorName(ClassSchedule s) {
        Professor p = s.getProfessor() != null ? s.getProfessor()
                : (s.getPlan() != null ? s.getPlan().getProfessor() : null);
        return p != null ? p.getName() : null;
    }

    private static String newCode() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        return sb.toString();
    }

    private static AttendanceDto toDto(Attendance a, Boolean created) {
        Student st = a.getStudent();
        ClassSchedule s = a.getSchedule();
        return AttendanceDto.builder()
                .id(a.getId())
                .studentId(st.getId())
                .studentName(st.getName())
                .photoUrl(st.getPhotoUrl())
                .belt(st.getBelt())
                .scheduleId(s != null ? s.getId() : null)
                .className(s != null ? s.getClassName() : null)
                .startTime(s != null ? s.getStartTime().toString() : null)
                .endTime(s != null ? s.getEndTime().toString() : null)
                .date(a.getDate().toString())
                .checkedInAt(a.getCheckedInAt().toString())
                .source(a.getSource().name())
                .created(created)
                .build();
    }
}
