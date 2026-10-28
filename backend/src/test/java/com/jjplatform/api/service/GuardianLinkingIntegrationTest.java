package com.jjplatform.api.service;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.dto.StudentRegisterRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Who sees which student in the portal, in the order an academy really loads its records: a parent who
 * trains and gets a child added later, a guardian who starts training, a second child, staff re-saving or
 * changing the guardian, a teen with their own account. Linking happens on registration and on every
 * portal load ({@link StudentService#linkNewRecords}); both use the same email + RUT trust boundary.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:guardianlinking;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class GuardianLinkingIntegrationTest {

    static final String PAPA_RUT = "17.319.483-8";

    @Autowired StudentService studentService;
    @Autowired AuthService authService;
    @Autowired StudentRepository studentRepository;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired TransactionTemplate tx;

    @MockBean EmailService emailService;

    static final AtomicInteger seq = new AtomicInteger();
    Academy academy;
    String papaEmail;

    @BeforeEach
    void setUp() {
        int n = seq.incrementAndGet();
        User owner = userRepository.save(User.builder().email("owner" + n + "@test.cl").password("x").role(User.Role.ADMIN).build());
        academy = academyRepository.save(Academy.builder().user(owner).name("Academia " + n).build());
        papaEmail = "papa" + n + "@test.cl";
    }

    // ── El papá entrena (tiene cuenta) y después le agregan su primer hijo ──
    @Test
    void parentWhoTrainsSeesAChildAddedLater() {
        User papa = account(papaEmail);
        own(papa, PAPA_RUT);
        Long hija = child("Hija", papaEmail, "173194838");

        studentService.linkNewRecords(papa.getId());

        assertThat(visible(papa)).contains(hija);
    }

    // ── El apoderado no entrenaba (solo su hijo) y empieza a entrenar: la academia le crea su ficha ──
    @Test
    void guardianWhoStartsTrainingGetsTheirOwnRecord() {
        User papa = account(papaEmail);
        Long hijo = child("Hijo", papaEmail, PAPA_RUT);
        guardianOf(hijo, papa);
        Long own = studentRepository.save(Student.builder().academy(academy).name("Papá").rut("17319483-8")
                .email(papaEmail).active(true).build()).getId();

        studentService.linkNewRecords(papa.getId());

        assertThat(studentRepository.findById(own).orElseThrow().getUser().getId()).isEqualTo(papa.getId());
        assertThat(visible(papa)).containsExactlyInAnyOrder(hijo, own);
    }

    // ── Apoderado con un hijo al que le agregan un segundo hijo ──
    @Test
    void guardianSeesASecondChild() {
        User papa = account(papaEmail);
        Long hijo1 = child("Hijo 1", papaEmail, PAPA_RUT);
        guardianOf(hijo1, papa);
        Long hijo2 = child("Hijo 2", papaEmail, "17319483-8");

        studentService.linkNewRecords(papa.getId());

        assertThat(visible(papa)).containsExactlyInAnyOrder(hijo1, hijo2);
    }

    // ── Mismo correo pero RUT de otra persona: no se vincula ──
    @Test
    void sameEmailWithSomeoneElsesRutIsNotLinked() {
        User papa = account(papaEmail);
        own(papa, PAPA_RUT);
        Long ajeno = child("Ajeno", papaEmail, "11.111.111-1");
        Long ajenoPropio = studentRepository.save(Student.builder().academy(academy).name("Otro").rut("11.111.111-1")
                .email(papaEmail).active(true).build()).getId();

        studentService.linkNewRecords(papa.getId());

        assertThat(visible(papa)).doesNotContain(ajeno, ajenoPropio);
    }

    // ── Un hijo con su propia cuenta (adolescente): el papá lo ve como apoderado, pero la ficha sigue siendo del hijo ──
    @Test
    void childWithTheirOwnAccountKeepsItWhenTheParentIsLinked() {
        User papa = account(papaEmail);
        own(papa, PAPA_RUT);
        User teen = account("teen" + seq.incrementAndGet() + "@test.cl");
        Long hijo = child("Hijo", papaEmail, PAPA_RUT);
        tx(hijo, s -> s.setUser(teen));

        studentService.linkNewRecords(papa.getId());

        assertThat(visible(papa)).contains(hijo);
        assertThat(visible(teen)).containsExactly(hijo);
        assertThat(studentRepository.findById(hijo).orElseThrow().getUser().getId()).isEqualTo(teen.getId());
    }

    // ── Staff vuelve a guardar la ficha del hijo con el mismo RUT en otro formato: el apoderado no pierde acceso ──
    @Test
    void resavingTheSameGuardianInAnotherFormatKeepsAccess() {
        User papa = account(papaEmail);
        Long hijo = child("Hijo", papaEmail, "173194838");
        guardianOf(hijo, papa);

        edit(hijo, dto -> { dto.setGuardianRut("17.319.483-8"); dto.setGuardianEmail(papaEmail.toUpperCase()); });

        assertThat(visible(papa)).containsExactly(hijo);
    }

    // ── Staff cambia el apoderado a la mamá: el papá pierde acceso y la mamá (que ya tenía cuenta) lo gana ──
    @Test
    void changingTheGuardianMovesAccessToTheNewOne() {
        User papa = account(papaEmail);
        Long hijo = child("Hijo", papaEmail, PAPA_RUT);
        guardianOf(hijo, papa);
        String mamaEmail = "mama" + seq.incrementAndGet() + "@test.cl";
        User mama = account(mamaEmail);
        own(mama, "12.345.678-5");

        edit(hijo, dto -> { dto.setGuardianEmail(mamaEmail); dto.setGuardianRut("12345678-5"); });
        studentService.linkNewRecords(mama.getId());

        assertThat(visible(papa)).doesNotContain(hijo);
        assertThat(visible(mama)).contains(hijo);
    }

    // ── Staff quita el apoderado: pierde acceso y no vuelve solo ──
    @Test
    void removingTheGuardianRevokesAccess() {
        User papa = account(papaEmail);
        own(papa, PAPA_RUT);
        Long hijo = child("Hijo", papaEmail, PAPA_RUT);
        guardianOf(hijo, papa);

        edit(hijo, dto -> { dto.setGuardianEmail(""); dto.setGuardianRut(""); dto.setGuardianName(""); });
        studentService.linkNewRecords(papa.getId());

        assertThat(visible(papa)).doesNotContain(hijo);
    }

    // ── Registro de un apoderado que no entrena: con su correo + RUT ve a su hijo; con otro RUT no entra ──
    @Test
    void guardianRegistersWithTheRutOnTheChildsRecord() {
        Long hijo = child("Hijo", papaEmail, PAPA_RUT);

        assertThrows(IllegalArgumentException.class, () -> authService.registerStudent(register("11.111.111-1")));
        authService.registerStudent(register("173194838"));

        User papa = userRepository.findByEmail(papaEmail).orElseThrow();
        assertThat(visible(papa)).containsExactly(hijo);
    }

    // ── helpers ──

    private User account(String email) {
        return userRepository.save(User.builder().email(email).password("x").role(User.Role.STUDENT).build());
    }

    private Long own(User u, String rut) {
        return studentRepository.save(Student.builder().academy(academy).name("Propio " + u.getEmail()).rut(rut)
                .email(u.getEmail()).user(u).active(true).build()).getId();
    }

    private Long child(String name, String guardianEmail, String guardianRut) {
        return studentRepository.save(Student.builder().academy(academy).name(name).rut("2" + seq.incrementAndGet() + "-K")
                .guardianName("Apoderado").guardianEmail(guardianEmail).guardianRut(guardianRut).active(true).build()).getId();
    }

    private void guardianOf(Long studentId, User u) {
        tx(studentId, s -> s.getGuardians().add(u));
    }

    private void tx(Long studentId, Consumer<Student> change) {
        tx.executeWithoutResult(t -> change.accept(studentRepository.findById(studentId).orElseThrow()));
    }

    /** What staff do in Alumnos → Editar: load the record, change fields, save. */
    private void edit(Long studentId, Consumer<StudentDto> change) {
        StudentDto dto = studentService.getStudent(studentId, academy.getId());
        change.accept(dto);
        studentService.updateStudent(studentId, dto, academy.getId());
    }

    private List<Long> visible(User u) {
        return studentRepository.findAccessibleByUser(u.getId()).stream().map(Student::getId).toList();
    }

    private StudentRegisterRequest register(String rut) {
        StudentRegisterRequest r = new StudentRegisterRequest();
        r.setRut(rut);
        r.setEmail(papaEmail);
        return r;
    }
}
