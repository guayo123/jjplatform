package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassReservation;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassReservationRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * "Eliminar" una clase la da de baja (active = false) en vez de borrarla: se conservan la clase y sus
 * reservas como historial, y la clave foránea de class_reservations ya no impide la operación.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:scheduledeactivation;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class ScheduleDeactivationIntegrationTest {

    @Autowired ClassReservationService service;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired ClassScheduleRepository scheduleRepository;
    @Autowired ClassReservationRepository reservationRepository;

    private Academy academy(String email) {
        User u = userRepository.save(User.builder().email(email).password("x").role(User.Role.ADMIN).build());
        return academyRepository.save(Academy.builder().user(u).name("A " + email).build());
    }

    private ClassSchedule schedule(Academy a, String name) {
        // Mañana a esa hora no importa: lo que se prueba es activo/inactivo, no el día
        return scheduleRepository.save(ClassSchedule.builder().academy(a).dayOfWeek("Lunes")
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0)).className(name).build());
    }

    @Test
    void removingAScheduleKeepsItAndItsReservationsButHidesIt() {
        Academy a = academy("deact@test.cl");
        ClassSchedule capoeira = schedule(a, "Capoeira");
        ClassSchedule bjj = schedule(a, "BJJ");
        Student s = studentRepository.save(Student.builder().academy(a).name("Alumno").active(true).build());
        reservationRepository.save(ClassReservation.builder().schedule(capoeira).student(s).classDate(LocalDate.now().plusDays(1)).build());
        reservationRepository.save(ClassReservation.builder().schedule(capoeira).student(s).classDate(LocalDate.now().plusDays(8)).build());
        reservationRepository.save(ClassReservation.builder().schedule(bjj).student(s).classDate(LocalDate.now().plusDays(2)).build());

        assertThat(scheduleRepository.findByAcademyIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(a.getId())).hasSize(2);

        assertThat(service.deactivateSchedule(a.getId(), capoeira.getId())).isTrue();

        // No se borró nada: la clase y las 3 reservas siguen en la base
        ClassSchedule kept = scheduleRepository.findById(capoeira.getId()).orElseThrow();
        assertThat(kept.getActive()).isFalse();
        assertThat(reservationRepository.count()).isEqualTo(3);

        // Pero ya no aparece en los listados de clases vigentes
        assertThat(scheduleRepository.findByAcademyIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(a.getId()))
                .extracting(ClassSchedule::getClassName).containsExactly("BJJ");
    }

    @Test
    void aRemovedScheduleNoLongerAcceptsReservations() {
        Academy a = academy("deact2@test.cl");
        ClassSchedule old = schedule(a, "Capoeira");
        Student s = studentRepository.save(Student.builder().academy(a).name("Alumno").active(true).build());
        service.deactivateSchedule(a.getId(), old.getId());

        LocalDate nextMonday = LocalDate.now().plusDays(1);
        while (nextMonday.getDayOfWeek() != java.time.DayOfWeek.MONDAY) nextMonday = nextMonday.plusDays(1);
        LocalDate date = nextMonday;

        assertThrows(IllegalArgumentException.class, () -> service.reserve(s.getId(), a.getId(), old.getId(), date));
        assertThat(reservationRepository.count()).isZero();
    }

    @Test
    void cannotRemoveAnotherAcademysScheduleOrAMissingOne() {
        Academy mine = academy("mine2@test.cl");
        Academy other = academy("other3@test.cl");
        ClassSchedule theirs = schedule(other, "Ajena");

        assertThat(service.deactivateSchedule(mine.getId(), theirs.getId())).isFalse();
        assertThat(scheduleRepository.findById(theirs.getId()).orElseThrow().getActive()).isTrue();
        assertThat(service.deactivateSchedule(mine.getId(), 999_999L)).isFalse();
    }
}
