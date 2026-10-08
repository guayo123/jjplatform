package com.jjplatform.api.service;

import com.jjplatform.api.controller.PublicController;
import com.jjplatform.api.dto.AcademyPublicDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import com.jjplatform.api.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Desactivar una disciplina la oculta de todos lados (planes, horarios y profesores de la página pública),
 * sin tocar sus planes ni clases uno a uno; reactivarla lo devuelve todo.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:disciplinecascade;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
@Transactional
class DisciplineCascadeIntegrationTest {

    @Autowired PublicController publicController;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired DisciplineRepository disciplineRepository;
    @Autowired PlanRepository planRepository;
    @Autowired ProfessorRepository professorRepository;
    @Autowired ClassScheduleRepository scheduleRepository;
    @PersistenceContext EntityManager em;

    private Discipline capoeira;
    private ClassSchedule capoeiraClass;

    private Academy setUp() {
        User u = userRepository.save(User.builder().email("cascade@test.cl").password("x").role(User.Role.ADMIN).build());
        Academy a = academyRepository.save(Academy.builder().user(u).name("Academia").build());

        capoeira = disciplineRepository.save(Discipline.builder().academy(a).name("Capoeira").build());
        Discipline bjj = disciplineRepository.save(Discipline.builder().academy(a).name("Jiu-Jitsu").build());

        Professor profCapoeira = professorRepository.save(Professor.builder().academy(a).name("Profe Capoeira").build());
        Professor profBjj = professorRepository.save(Professor.builder().academy(a).name("Profe BJJ").build());
        Professor profLibre = professorRepository.save(Professor.builder().academy(a).name("Profe sin disciplina").build());

        Plan planCapoeira = planRepository.save(Plan.builder().academy(a).name("Plan Capoeira").discipline(capoeira)
                .professor(profCapoeira).price(20000).build());
        Plan planBjj = planRepository.save(Plan.builder().academy(a).name("Plan BJJ").discipline(bjj)
                .professor(profBjj).price(30000).build());

        capoeiraClass = scheduleRepository.save(ClassSchedule.builder().academy(a).plan(planCapoeira).professor(profCapoeira)
                .dayOfWeek("Lunes").startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0)).className("Capoeira").build());
        scheduleRepository.save(ClassSchedule.builder().academy(a).plan(planBjj).professor(profBjj)
                .dayOfWeek("Martes").startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0)).className("BJJ").build());
        // Una clase suelta, sin plan: no depende de ninguna disciplina
        scheduleRepository.save(ClassSchedule.builder().academy(a)
                .dayOfWeek("Jueves").startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0)).className("Libre").build());
        return a;
    }

    private AcademyPublicDto publicView(Academy a) {
        em.flush();
        em.clear();
        return publicController.getAcademy(a.getId()).getBody();
    }

    @Test
    void deactivatingADisciplineHidesItsPlansClassesAndProfessorsEverywhere() {
        Academy a = setUp();

        AcademyPublicDto before = publicView(a);
        assertThat(before.getPlans()).extracting(AcademyPublicDto.PlanDto::getName).containsExactlyInAnyOrder("Plan Capoeira", "Plan BJJ");
        assertThat(before.getSchedules()).extracting(AcademyPublicDto.ScheduleDto::getClassName).containsExactlyInAnyOrder("Capoeira", "BJJ", "Libre");
        assertThat(before.getProfessors()).extracting(AcademyPublicDto.ProfessorDto::getName)
                .containsExactlyInAnyOrder("Profe Capoeira", "Profe BJJ", "Profe sin disciplina");

        Discipline d = disciplineRepository.findById(capoeira.getId()).orElseThrow();
        d.setActive(false);
        disciplineRepository.save(d);

        AcademyPublicDto off = publicView(a);
        assertThat(off.getPlans()).extracting(AcademyPublicDto.PlanDto::getName).containsExactly("Plan BJJ");
        assertThat(off.getSchedules()).extracting(AcademyPublicDto.ScheduleDto::getClassName).containsExactlyInAnyOrder("BJJ", "Libre");
        // El profesor que solo daba Capoeira desaparece; el que no tenía disciplina asociada se mantiene
        assertThat(off.getProfessors()).extracting(AcademyPublicDto.ProfessorDto::getName)
                .containsExactlyInAnyOrder("Profe BJJ", "Profe sin disciplina");
        assertThat(Offering.scheduleOn(scheduleRepository.findById(capoeiraClass.getId()).orElseThrow())).isFalse();

        // Reactivar la disciplina lo devuelve todo (nada se borró)
        d = disciplineRepository.findById(capoeira.getId()).orElseThrow();
        d.setActive(true);
        disciplineRepository.save(d);

        AcademyPublicDto back = publicView(a);
        assertThat(back.getPlans()).hasSize(2);
        assertThat(back.getSchedules()).hasSize(3);
        assertThat(back.getProfessors()).hasSize(3);
    }
}
