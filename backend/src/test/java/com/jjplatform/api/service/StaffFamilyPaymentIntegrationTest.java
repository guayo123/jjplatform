package com.jjplatform.api.service;

import com.jjplatform.api.dto.FamilyDueDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * The admin records by hand the month of a guardian: sees each record in their charge with its balance
 * and the family total, and settles them all at once (new payments and the rest of an abono).
 *
 * <p>Family by account: papá (adult $50.000), hijo 1 (kids $35.000 − $15.000 family discount) and hijo 2
 * (kids $35.000). Family by guardian RUT only (never used the portal): mamá + hija.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:stafffamily;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class StaffFamilyPaymentIntegrationTest {

    static final int MONTH = 11, YEAR = 2026;
    static final AtomicInteger seq = new AtomicInteger();

    @Autowired FamilyPaymentService familyPayments;
    @Autowired PaymentService paymentService;
    @Autowired PaymentRepository paymentRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;

    @MockBean PaymentNotificationService notifications;

    Academy academy;
    Plan adult, kids;
    Long papa, hijo1, hijo2, ajeno;

    @BeforeEach
    void setUp() {
        int n = seq.incrementAndGet();
        User owner = userRepository.save(User.builder().email("owner" + n + "@sf.cl").password("x").role(User.Role.ADMIN).build());
        academy = academyRepository.save(Academy.builder().user(owner).name("Academia " + n).build());
        adult = planRepository.save(Plan.builder().academy(academy).name("Adulto").price(50000).displayOrder(1).build());
        kids = planRepository.save(Plan.builder().academy(academy).name("Kids").price(35000).displayOrder(2).build());

        User papaUser = userRepository.save(User.builder().email("papa" + n + "@sf.cl").password("x").role(User.Role.STUDENT).build());
        papa = save(Student.builder().name("Papá").user(papaUser).plans(new ArrayList<>(List.of(adult))));
        hijo1 = save(Student.builder().name("Hijo 1").plans(new ArrayList<>(List.of(kids)))
                .guardians(new HashSet<>(Set.of(papaUser))).guardianName("Papá")
                .monthlyDiscount(BigDecimal.valueOf(15000)).monthlyDiscountType("AMOUNT").monthlyDiscountReason("Descuento familiar"));
        hijo2 = save(Student.builder().name("Hijo 2").plans(new ArrayList<>(List.of(kids))).guardians(new HashSet<>(Set.of(papaUser))));
        ajeno = save(Student.builder().name("Ajeno").plans(new ArrayList<>(List.of(adult))));
    }

    @Test
    void choosingAChildShowsEveryRecordOfTheGuardianWithItsBalanceAndTheTotal() {
        FamilyDueDto f = familyPayments.familyDue(academy.getId(), hijo2, MONTH, YEAR);

        assertThat(f.getMembers()).extracting(FamilyDueDto.Member::getStudentId).containsExactly(hijo2, papa, hijo1);
        assertThat(f.getGuardianName()).isEqualTo("Papá");
        assertThat(due(f, hijo1).intValue()).isEqualTo(20000);
        assertThat(member(f, hijo1).getPlanTotal().intValue()).isEqualTo(35000);
        assertThat(member(f, hijo1).getDiscountReason()).isEqualTo("Descuento familiar");
        assertThat(f.getTotalDue().intValue()).isEqualTo(105000);
    }

    @Test
    void payingAllRecordsNewPaymentsAndCompletesAnAbono() {
        // Hijo 2 already left $10.000 of his $35.000.
        paymentService.createPayment(payment(hijo2, 10000), academy.getId());
        FamilyDueDto before = familyPayments.familyDue(academy.getId(), papa, MONTH, YEAR);
        assertThat(member(before, hijo2).getStatus()).isEqualTo("PARTIAL");
        assertThat(before.getTotalDue().intValue()).isEqualTo(50000 + 20000 + 25000);

        List<PaymentDto> paid = familyPayments.payAll(academy.getId(), papa, List.of(), MONTH, YEAR, "Efectivo");
        assertThat(paid).hasSize(3);

        FamilyDueDto after = familyPayments.familyDue(academy.getId(), papa, MONTH, YEAR);
        assertThat(after.getMembers()).allMatch(m -> "PAID".equals(m.getStatus()));
        assertThat(after.getTotalDue()).isZero();
        assertThat(paymentRepository.findByStudentIdAndMonthAndYear(hijo1, MONTH, YEAR).orElseThrow().getNotes())
                .isEqualTo("Descuento familiar · Efectivo");
        assertThrows(IllegalArgumentException.class,
                () -> familyPayments.payAll(academy.getId(), papa, List.of(), MONTH, YEAR, null));
    }

    @Test
    void onlyTheChosenMembersArePaidAndStrangersAreRejected() {
        familyPayments.payAll(academy.getId(), papa, List.of(hijo1), MONTH, YEAR, null);
        FamilyDueDto f = familyPayments.familyDue(academy.getId(), papa, MONTH, YEAR);
        assertThat(member(f, hijo1).getStatus()).isEqualTo("PAID");
        assertThat(member(f, hijo2).getStatus()).isEqualTo("PENDING");

        assertThrows(IllegalArgumentException.class,
                () -> familyPayments.payAll(academy.getId(), papa, List.of(ajeno), MONTH, YEAR, null));
        assertThat(familyPayments.familyDue(academy.getId(), ajeno, MONTH, YEAR).getMembers()).hasSize(1);
    }

    @Test
    void aFamilyLinkedOnlyByTheGuardianRutIsFoundToo() {
        Long mama = save(Student.builder().name("Mamá").rut("12.345.678-5").plans(new ArrayList<>(List.of(adult))));
        Long hija = save(Student.builder().name("Hija").guardianRut("12345678-5").guardianName("Mamá")
                .plans(new ArrayList<>(List.of(kids))));
        Long prima = save(Student.builder().name("Prima").guardianRut("123456785").plans(new ArrayList<>(List.of(kids))));

        assertThat(familyPayments.familyDue(academy.getId(), hija, MONTH, YEAR).getMembers())
                .extracting(FamilyDueDto.Member::getStudentId).containsExactly(hija, mama, prima);
        assertThat(familyPayments.familyDue(academy.getId(), mama, MONTH, YEAR).getTotalDue().intValue())
                .isEqualTo(50000 + 35000 + 35000);
    }

    @Test
    void anotherAcademyCannotReadTheFamily() {
        User owner2 = userRepository.save(User.builder().email("o" + seq.incrementAndGet() + "@sf.cl").password("x").role(User.Role.ADMIN).build());
        Academy other = academyRepository.save(Academy.builder().user(owner2).name("Otra").build());
        assertThrows(ResourceNotFoundException.class, () -> familyPayments.familyDue(other.getId(), papa, MONTH, YEAR));
    }

    // ── helpers ──

    private Long save(Student.StudentBuilder b) {
        return studentRepository.save(b.academy(academy).active(true).build()).getId();
    }

    private static FamilyDueDto.Member member(FamilyDueDto f, Long id) {
        return f.getMembers().stream().filter(m -> m.getStudentId().equals(id)).findFirst().orElseThrow();
    }

    private static BigDecimal due(FamilyDueDto f, Long id) {
        return member(f, id).getDue();
    }

    private static PaymentDto payment(Long studentId, int amount) {
        PaymentDto p = new PaymentDto();
        p.setStudentId(studentId);
        p.setAmount(BigDecimal.valueOf(amount));
        p.setMonth(MONTH);
        p.setYear(YEAR);
        return p;
    }
}
