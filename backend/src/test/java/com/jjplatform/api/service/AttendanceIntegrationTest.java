package com.jjplatform.api.service;

import com.jjplatform.api.dto.AttendanceDayDto;
import com.jjplatform.api.dto.AttendanceDto;
import com.jjplatform.api.dto.CheckinInfoDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassReservation;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassReservationRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import com.jjplatform.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * QR attendance as the dojo uses it: a student scans during a class, scans twice, arrives when nothing is
 * scheduled, a parent marks their kids, someone tries to mark a stranger, the QR gets replaced, and the
 * staff day view with no-shows.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:attendance;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class AttendanceIntegrationTest {

    @Autowired AttendanceService attendanceService;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired ClassScheduleRepository scheduleRepository;
    @Autowired ClassReservationRepository reservationRepository;
    @Autowired TrainingSessionRepository trainingSessionRepository;
    @Autowired TransactionTemplate tx;

    @MockBean EmailService emailService;

    static final AtomicInteger seq = new AtomicInteger();
    Academy academy;
    String code;
    User alumno;
    Long alumnoId;

    @BeforeEach
    void setUp() {
        int n = seq.incrementAndGet();
        User owner = userRepository.save(User.builder().email("owner" + n + "@att.cl").password("x").role(User.Role.ADMIN).build());
        academy = academyRepository.save(Academy.builder().user(owner).name("Dojo " + n).build());
        code = attendanceService.getOrCreateCode(academy.getId());
        alumno = account("alumno" + n + "@att.cl");
        alumnoId = own(alumno, "Alumno " + n);
    }

    @Test
    void scanDuringAClassMarksItOnceAndShowsInTheDayView() {
        ClassSchedule clase = runningNow("Gi Adultos");

        CheckinInfoDto info = attendanceService.checkinInfo(code, alumno.getId());
        assertThat(info.getClasses()).extracting(CheckinInfoDto.ClassOption::getScheduleId).containsExactly(clase.getId());

        AttendanceDto first = attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), clase.getId()).get(0);
        AttendanceDto again = attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), clase.getId()).get(0);
        assertThat(first.getCreated()).isTrue();
        assertThat(again.getCreated()).isFalse();
        assertThat(again.getId()).isEqualTo(first.getId());

        AttendanceDayDto day = attendanceService.day(academy.getId(), LocalDate.now());
        AttendanceDayDto.ClassDay gi = day.getClasses().stream().filter(c -> c.getScheduleId().equals(clase.getId())).findFirst().orElseThrow();
        assertThat(gi.getAttendees()).extracting(AttendanceDto::getStudentId).containsExactly(alumnoId);
        assertThat(attendanceService.checkinInfo(code, alumno.getId()).getProfiles().get(0).getCheckedIn()).containsExactly(clase.getId());
    }

    @Test
    void withoutARunningClassItIsAFreeSessionAndWithOneTheClassIsRequired() {
        AttendanceDto free = attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), null).get(0);
        assertThat(free.getScheduleId()).isNull();
        assertThat(attendanceService.day(academy.getId(), LocalDate.now()).getFree()).hasSize(1);

        runningNow("No-Gi");
        assertThrows(IllegalArgumentException.class,
                () -> attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), null));
    }

    @Test
    void aClassNotRunningNowCannotBeChosen() {
        ClassSchedule later = scheduleRepository.save(ClassSchedule.builder().academy(academy).className("Tarde")
                .dayOfWeek(dayName(LocalDate.now().plusDays(1).getDayOfWeek()))
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0)).build());
        assertThrows(IllegalArgumentException.class,
                () -> attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), later.getId()));
    }

    @Test
    void aGuardianMarksTheirKidsButNotSomeoneElse() {
        User papa = account("papa" + seq.incrementAndGet() + "@att.cl");
        Long hijo = kid("Hijo", papa);
        Long hija = kid("Hija", papa);
        Long ajeno = own(account("ajeno" + seq.incrementAndGet() + "@att.cl"), "Ajeno");

        assertThat(attendanceService.checkinInfo(code, papa.getId()).getProfiles())
                .extracting(CheckinInfoDto.Profile::getStudentId).containsExactlyInAnyOrder(hijo, hija);
        assertThat(attendanceService.checkin(code, papa.getId(), List.of(hijo, hija), null)).hasSize(2);
        assertThrows(ResourceNotFoundException.class,
                () -> attendanceService.checkin(code, papa.getId(), List.of(ajeno), null));
    }

    @Test
    void someoneFromAnotherAcademyIsTurnedAway() {
        User owner2 = userRepository.save(User.builder().email("o" + seq.incrementAndGet() + "@att.cl").password("x").role(User.Role.ADMIN).build());
        Academy other = academyRepository.save(Academy.builder().user(owner2).name("Otra").build());
        String otherCode = attendanceService.getOrCreateCode(other.getId());
        assertThrows(IllegalArgumentException.class, () -> attendanceService.checkinInfo(otherCode, alumno.getId()));
    }

    @Test
    void replacingTheQrVoidsTheOldOne() {
        String fresh = attendanceService.regenerateCode(academy.getId());
        assertThat(fresh).isNotEqualTo(code);
        assertThrows(ResourceNotFoundException.class, () -> attendanceService.checkinInfo(code, alumno.getId()));
        assertThat(attendanceService.checkinInfo(fresh.toLowerCase(), alumno.getId()).getAcademyId()).isEqualTo(academy.getId());
    }

    @Test
    void loggingToTheJournalCreatesOneEntryPerDay() {
        ClassSchedule clase = runningNow("Gi");
        Long attId = attendanceService.checkin(code, alumno.getId(), List.of(alumnoId), clase.getId()).get(0).getId();

        assertThat(attendanceService.logToJournal(alumno.getId(), List.of(attId))).isEqualTo(1);
        assertThat(attendanceService.logToJournal(alumno.getId(), List.of(attId))).isZero();
        assertThat(trainingSessionRepository.existsByStudentIdAndDate(alumnoId, LocalDate.now())).isTrue();

        User otro = account("otro" + seq.incrementAndGet() + "@att.cl");
        assertThrows(ResourceNotFoundException.class, () -> attendanceService.logToJournal(otro.getId(), List.of(attId)));
    }

    @Test
    void staffSeeNoShowsMarkByHandAndRemove() {
        ClassSchedule clase = runningNow("Kids");
        Long faltó = own(account("falto" + seq.incrementAndGet() + "@att.cl"), "Reservó y no vino");
        tx.executeWithoutResult(t -> reservationRepository.save(ClassReservation.builder()
                .schedule(scheduleRepository.findById(clase.getId()).orElseThrow())
                .student(studentRepository.findById(faltó).orElseThrow())
                .classDate(LocalDate.now()).build()));

        AttendanceDayDto.ClassDay kids = classDay(clase.getId());
        assertThat(kids.getNoShows()).extracting(r -> r.getStudentId()).containsExactly(faltó);

        AttendanceDto manual = attendanceService.markManual(academy.getId(), faltó, clase.getId(), LocalDate.now());
        assertThat(manual.getSource()).isEqualTo("MANUAL");
        assertThat(classDay(clase.getId()).getNoShows()).isEmpty();

        attendanceService.delete(academy.getId(), manual.getId());
        assertThat(classDay(clase.getId()).getAttendees()).isEmpty();
        assertThat(((Number) attendanceService.history(academy.getId(), faltó).get("thisMonth")).intValue()).isZero();

        assertThrows(IllegalArgumentException.class,
                () -> attendanceService.markManual(academy.getId(), faltó, null, LocalDate.now().plusDays(1)));
    }

    // ── helpers ──

    private AttendanceDayDto.ClassDay classDay(Long scheduleId) {
        return attendanceService.day(academy.getId(), LocalDate.now()).getClasses().stream()
                .filter(c -> c.getScheduleId().equals(scheduleId)).findFirst().orElseThrow();
    }

    /** A class of today's grid that is accepting check-ins right now (clamped so it never wraps midnight). */
    private ClassSchedule runningNow(String name) {
        LocalTime now = LocalDateTime.now().toLocalTime();
        LocalTime start = now.isBefore(LocalTime.of(0, 10)) ? LocalTime.MIDNIGHT : now.minusMinutes(10);
        LocalTime end = now.isAfter(LocalTime.of(22, 58)) ? LocalTime.of(23, 59, 59) : now.plusMinutes(60);
        return scheduleRepository.save(ClassSchedule.builder().academy(academy).className(name)
                .dayOfWeek(dayName(LocalDate.now().getDayOfWeek())).startTime(start).endTime(end).build());
    }

    private static String dayName(DayOfWeek d) {
        return ClassReservationService.DAY_MAP.entrySet().stream()
                .filter(e -> e.getValue() == d).map(Map.Entry::getKey).findFirst().orElseThrow();
    }

    private User account(String email) {
        return userRepository.save(User.builder().email(email).password("x").role(User.Role.STUDENT).build());
    }

    private Long own(User u, String name) {
        return studentRepository.save(Student.builder().academy(academy).name(name).rut("1" + seq.incrementAndGet() + "-K")
                .email(u.getEmail()).user(u).active(true).build()).getId();
    }

    private Long kid(String name, User guardian) {
        Long id = studentRepository.save(Student.builder().academy(academy).name(name).rut("2" + seq.incrementAndGet() + "-K")
                .active(true).build()).getId();
        tx.executeWithoutResult(t -> studentRepository.findById(id).orElseThrow().getGuardians().add(guardian));
        return id;
    }
}
