package com.jjplatform.api.service;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Payment;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Online payment of a guardian (apoderado) for themself and their children, end to end against a fake
 * Khipu: start the checkout from the portal, the parent pays, Khipu notifies, and every month covered
 * by that payment ends up PAID (and nothing else does).
 *
 * <p>Family: papá (adult plan $50.000, trains), hijo 1 (kids $35.000 with a $15.000 family discount →
 * $20.000) and hijo 2 (kids $35.000, no discount).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:familypayment;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class FamilyPaymentIntegrationTest {

    static final int MONTH = 10, YEAR = 2026;

    @Autowired PortalService portal;
    @Autowired StudentService studentService;
    @Autowired PaymentGatewayService gateway;
    @Autowired PaymentRepository paymentRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired TransactionTemplate tx;

    @MockBean RestTemplate restTemplate;
    @MockBean SecurityHelper securityHelper;
    @MockBean PaymentNotificationService notifications;

    // ── Fake Khipu: payments by id, created by POST, read by GET, cancelled by DELETE ──
    final Map<String, Map<String, Object>> khipu = new HashMap<>();
    final List<String> cancelled = new ArrayList<>();
    final AtomicInteger seq = new AtomicInteger();
    static final AtomicInteger academies = new AtomicInteger();

    Long papa, hijo1, hijo2;
    User papaUser;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenAnswer(inv -> {
            Map<String, Object> body = ((HttpEntity<Map<String, Object>>) inv.getArgument(1)).getBody();
            String id = "kp" + seq.incrementAndGet();
            Map<String, Object> p = new HashMap<>();
            p.put("transaction_id", body.get("transaction_id"));
            p.put("amount", body.get("amount"));
            p.put("status", "pending");
            khipu.put(id, p);
            return Map.of("payment_id", id, "payment_url", "https://khipu.test/" + id);
        });
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class))).thenAnswer(inv -> {
            String url = inv.getArgument(0);
            return ResponseEntity.ok(new HashMap<>(khipu.get(url.substring(url.lastIndexOf('/') + 1))));
        });
        when(restTemplate.exchange(anyString(), eq(HttpMethod.DELETE), any(HttpEntity.class), eq(Void.class))).thenAnswer(inv -> {
            String url = inv.getArgument(0);
            String id = url.substring(url.lastIndexOf('/') + 1);
            cancelled.add(id);
            khipu.get(id).put("status", "deleted");
            return ResponseEntity.noContent().build();
        });

        int n = academies.incrementAndGet();
        User owner = userRepository.save(User.builder().email("owner" + n + "@test.cl").password("x").role(User.Role.ADMIN).build());
        Academy a = academyRepository.save(Academy.builder().user(owner).name("Academia " + n).khipuApiKey("test-key").build());
        Plan adult = planRepository.save(Plan.builder().academy(a).name("Adulto").price(50000).displayOrder(1).build());
        Plan kids = planRepository.save(Plan.builder().academy(a).name("Kids").price(35000).displayOrder(2).build());

        papaUser = userRepository.save(User.builder().email("papa" + n + "@test.cl").password("x").role(User.Role.STUDENT).build());
        papa = studentRepository.save(Student.builder().academy(a).name("Papá").user(papaUser).active(true)
                .plans(new ArrayList<>(List.of(adult))).build()).getId();
        hijo1 = studentRepository.save(Student.builder().academy(a).name("Hijo 1").active(true)
                .plans(new ArrayList<>(List.of(kids))).guardians(new java.util.HashSet<>(Set.of(papaUser)))
                .monthlyDiscount(BigDecimal.valueOf(15000)).monthlyDiscountType("AMOUNT").monthlyDiscountReason("Descuento familiar")
                .build()).getId();
        hijo2 = studentRepository.save(Student.builder().academy(a).name("Hijo 2").active(true)
                .plans(new ArrayList<>(List.of(kids))).guardians(new java.util.HashSet<>(Set.of(papaUser))).build()).getId();

        loginAs(papaUser);
    }

    // ── Caso 1: el papá paga todo (él + 2 hijos) en un solo pago ──
    @Test
    void papaPaysHimselfAndTwoChildrenInOnePayment() {
        assertThat(due()).containsExactly(entry(papa, 50000), entry(hijo1, 20000), entry(hijo2, 35000));

        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(105000);
        assertThat(String.valueOf(khipu.get(kp).get("transaction_id"))).startsWith("grp-");

        // Started but not paid yet: all three in progress, none paid.
        for (Long s : List.of(papa, hijo1, hijo2)) assertThat(row(s).getStatus()).isEqualTo("PENDING_CONFIRMATION");

        payInKhipu(kp);
        notifyKhipu(row(papa).getId(), kp);

        assertPaid(papa, 50000, kp);
        assertPaid(hijo1, 20000, kp);
        assertPaid(hijo2, 35000, kp);
        assertThat(row(hijo1).getNotes()).isEqualTo("Descuento familiar");
        // One payment → one set of emails listing the three months.
        verify(notifications, times(1)).notifyPaid(argThat(ids -> ids.size() == 3));

        // Any of the three receipts shows the whole transfer.
        PaymentDto receipt = run(() -> portal.getPayments(hijo2)).get(0);
        assertThat(receipt.getGroupTotal()).isEqualByComparingTo(BigDecimal.valueOf(105000));
        assertThat(receipt.getGroupItems()).extracting(PaymentDto.GroupItem::getStudentName)
                .containsExactly("Papá", "Hijo 1", "Hijo 2");
        PaymentDto.GroupItem kid = receipt.getGroupItems().get(1);
        assertThat(kid.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(20000));
        assertThat(kid.getDiscountValue()).isEqualByComparingTo(BigDecimal.valueOf(15000));
        assertThat(kid.getDiscountReason()).isEqualTo("Descuento familiar");

        // Khipu repeats the notification: nothing changes, no extra emails, no duplicate alert.
        notifyKhipu(row(papa).getId(), kp);
        verify(notifications, times(1)).notifyPaid(any());
        verify(notifications, never()).notifyDuplicate(anyLong(), any(), any(), any());
        assertThat(due()).isEmpty();
    }

    // ── Caso 2: el papá paga solo a 1 hijo ──
    @Test
    void papaPaysOnlyOneChild() {
        run(() -> portal.createCheckout(hijo1, "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(20000);
        assertThat(khipu.get(kp).get("transaction_id")).isEqualTo(String.valueOf(row(hijo1).getId()));

        payInKhipu(kp);
        notifyKhipu(row(hijo1).getId(), kp);

        assertPaid(hijo1, 20000, kp);
        assertThat(row(papa)).isNull();
        assertThat(row(hijo2)).isNull();
        verify(notifications, times(1)).notifyPaid(List.of(row(hijo1).getId()));
        assertThat(run(() -> portal.getPayments(hijo1)).get(0).getGroupItems()).isNull(); // plain receipt
        // The others are still due: "pagar todo" now offers papá + hijo 2.
        assertThat(due()).containsExactly(entry(papa, 50000), entry(hijo2, 35000));
    }

    // ── Caso 2b: "pagar todo" con un solo hijo seleccionado se comporta como pago individual ──
    @Test
    void payAllWithASingleChildIsAPlainPayment() {
        run(() -> portal.createFamilyCheckout(papa, List.of(hijo2), "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        assertThat(khipu.get(kp).get("transaction_id")).isEqualTo(String.valueOf(row(hijo2).getId()));
        assertThat(row(hijo2).getCheckoutGroup()).isNull();

        payInKhipu(kp);
        notifyKhipu(row(hijo2).getId(), kp);
        assertPaid(hijo2, 35000, kp);
        assertThat(row(papa)).isNull();
        assertThat(row(hijo1)).isNull();
    }

    // ── Caso 3: el papá paga solo su mensualidad ──
    @Test
    void papaPaysOnlyHisOwnFee() {
        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(50000);

        payInKhipu(kp);
        notifyKhipu(row(papa).getId(), kp);

        assertPaid(papa, 50000, kp);
        assertThat(row(hijo1)).isNull();
        assertThat(row(hijo2)).isNull();
        assertThat(due()).containsExactly(entry(hijo1, 20000), entry(hijo2, 35000));
    }

    // ── Bordes ──

    @Test
    void payAllSkipsAMonthAlreadyPaid() {
        run(() -> portal.createCheckout(hijo1, "KHIPU", MONTH, YEAR, false, null));
        String first = lastKhipuId();
        payInKhipu(first);
        notifyKhipu(row(hijo1).getId(), first);

        // Stale screen still sends hijo 1: it's skipped, only papá + hijo 2 are charged.
        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(85000);
        payInKhipu(kp);
        notifyKhipu(row(papa).getId(), kp);

        assertPaid(papa, 50000, kp);
        assertPaid(hijo2, 35000, kp);
        assertPaid(hijo1, 20000, first); // untouched
    }

    @Test
    void abandonedPayAllIsCancelledOnRetryAndTheRetryPaysEverything() {
        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String abandoned = lastKhipuId();
        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String retry = lastKhipuId();

        assertThat(cancelled).containsExactly(abandoned); // cancelled once, not once per child
        payInKhipu(retry);
        // Confirmed by the portal's reconciliation (no webhook), opening any child's payments.
        run(() -> portal.getPayments(hijo2));

        assertPaid(papa, 50000, retry);
        assertPaid(hijo1, 20000, retry);
        assertPaid(hijo2, 35000, retry);
        assertThat(paymentRepository.count()).isEqualTo(countBefore() + 3);
    }

    @Test
    void underpaidGroupPaymentMarksNothing() {
        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String kp = lastKhipuId();
        khipu.get(kp).put("amount", 70000);
        payInKhipu(kp);
        notifyKhipu(row(papa).getId(), kp);

        for (Long s : List.of(papa, hijo1, hijo2)) assertThat(row(s).getStatus()).isEqualTo("PENDING_CONFIRMATION");
        verify(notifications, never()).notifyPaid(any());
    }

    @Test
    void childPaidAloneAfterAnAbandonedPayAllLeavesTheOthersPayable() {
        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null));
        run(() -> portal.createCheckout(hijo1, "KHIPU", MONTH, YEAR, false, null));
        String single = lastKhipuId();
        payInKhipu(single);
        notifyKhipu(row(hijo1).getId(), single);

        assertPaid(hijo1, 20000, single);
        assertThat(row(papa).getStatus()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(row(hijo2).getStatus()).isEqualTo("PENDING_CONFIRMATION");

        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo2), "KHIPU", MONTH, YEAR, false, null));
        String rest = lastKhipuId();
        assertThat(khipu.get(rest).get("amount")).isEqualTo(85000);
        payInKhipu(rest);
        notifyKhipu(row(papa).getId(), rest);
        assertPaid(papa, 50000, rest);
        assertPaid(hijo2, 35000, rest);
    }

    @Test
    void cannotPayForSomeoneElsesChild() {
        User stranger = userRepository.save(User.builder().email("otro" + seq.incrementAndGet() + "@test.cl")
                .password("x").role(User.Role.STUDENT).build());
        loginAs(stranger);
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () ->
                run(() -> portal.createFamilyCheckout(hijo1, List.of(hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null)));
        assertThat(khipu).isEmpty();
    }

    @Test
    void guardianWithASingleChildGetsNoPayAllOffer() {
        User mama = userRepository.save(User.builder().email("mama" + seq.incrementAndGet() + "@test.cl")
                .password("x").role(User.Role.STUDENT).build());
        tx.executeWithoutResult(s -> studentRepository.findById(hijo2).orElseThrow().getGuardians().add(mama));
        loginAs(mama);
        assertThat(due(hijo2)).containsExactly(entry(hijo2, 35000)); // one row → the portal shows no "pagar todo"
    }

    // ── La tarjeta "pagar todo" muestra el descuento de cada uno (precio antes y motivo) ──
    @Test
    void payAllRowsShowTheStandingDiscount() {
        Map<Long, Map<String, Object>> rows = new HashMap<>();
        run(() -> portal.getFamilyDue(papa, MONTH, YEAR)).forEach(r -> rows.put((Long) r.get("studentId"), r));

        assertThat(((BigDecimal) rows.get(hijo1).get("planTotal")).intValue()).isEqualTo(35000);
        assertThat(rows.get(hijo1).get("discountReason")).isEqualTo("Descuento familiar");
        assertThat(rows.get(hijo2)).doesNotContainKeys("planTotal", "discountReason");
        assertThat(rows.get(papa)).doesNotContainKeys("planTotal", "discountReason");
    }

    // ── Un papá que entrena y al que después le agregan una hija como apoderado ──
    @Test
    void childAddedLaterIsLinkedToTheParentWhoTrainsAndShowsInPayAll() {
        int n = seq.incrementAndGet();
        Academy a = studentRepository.findById(papa).orElseThrow().getAcademy();
        Plan adult = planRepository.findByAcademyIdOrderByDisplayOrderAscIdAsc(a.getId()).get(0);
        String email = "diego" + n + "@test.cl";
        User diego = userRepository.save(User.builder().email(email).password("x").role(User.Role.STUDENT).build());
        Long own = studentRepository.save(Student.builder().academy(a).name("Diego").email(email).rut("17.319.483-8")
                .user(diego).active(true).plans(new ArrayList<>(List.of(adult))).build()).getId();
        // Staff add the daughter naming him as guardian (RUT typed without dots).
        Long hija = studentRepository.save(Student.builder().academy(a).name("Hija").active(true)
                .guardianEmail(email).guardianRut("173194838").plans(new ArrayList<>(List.of(adult))).build()).getId();
        // Same email but someone else's RUT: must not be linked.
        Long ajena = studentRepository.save(Student.builder().academy(a).name("Ajena").active(true)
                .guardianEmail(email).guardianRut("11.111.111-1").plans(new ArrayList<>(List.of(adult))).build()).getId();

        studentService.linkNewRecords(diego.getId()); // what opening the portal does
        loginAs(diego);

        assertThat(due(own)).containsExactly(entry(own, 50000), entry(hija, 50000));
        assertThat(studentRepository.existsByIdAndGuardians_Id(ajena, diego.getId())).isFalse();
    }

    // ── helpers ──

    private long baseCount = -1;
    private long countBefore() { return baseCount; }

    private void loginAs(User u) {
        when(securityHelper.getCurrentUser()).thenReturn(u);
        if (baseCount < 0) baseCount = paymentRepository.count();
    }

    /** Each portal/webhook call runs as its own request (the app keeps the session open per request). */
    private <T> T run(Supplier<T> call) {
        return tx.execute(s -> call.get());
    }

    private void payInKhipu(String khipuId) {
        khipu.get(khipuId).put("status", "done");
    }

    /** What Khipu's notification does: hit /webhooks/khipu/{our payment id} with its payment_id. */
    private void notifyKhipu(Long paymentId, String khipuId) {
        tx.executeWithoutResult(s -> gateway.handleKhipuWebhook(paymentId, khipuId));
    }

    private String lastKhipuId() {
        return "kp" + seq.get();
    }

    private Payment row(Long studentId) {
        return paymentRepository.findByStudentIdAndMonthAndYear(studentId, MONTH, YEAR).orElse(null);
    }

    private void assertPaid(Long studentId, int amount, String khipuId) {
        tx.executeWithoutResult(s -> {
            Payment p = row(studentId);
            assertThat(p).as("payment of student %s", studentId).isNotNull();
            assertThat(p.getStatus()).as("status of student %s", studentId).isEqualTo("PAID");
            assertThat(p.getMethod()).isEqualTo("KHIPU");
            assertThat(p.getGatewayPaymentId()).isEqualTo(khipuId);
            assertThat(p.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(amount));
            assertThat(p.getPaidBy().getId()).isEqualTo(papaUser.getId());
        });
        // And the portal shows it as paid with nothing left to pay.
        PaymentDto dto = run(() -> portal.getPayments(studentId)).stream()
                .filter(d -> d.getMonth() == MONTH && d.getYear() == YEAR).findFirst().orElseThrow();
        assertThat(dto.getStatus()).isEqualTo("PAID");
        assertThat(dto.getOnlineState()).isNull();
        assertThat(dto.getRemaining()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    private List<Map.Entry<Long, Integer>> due() {
        return due(papa);
    }

    private List<Map.Entry<Long, Integer>> due(Long from) {
        return run(() -> portal.getFamilyDue(from, MONTH, YEAR)).stream()
                .map(r -> entry((Long) r.get("studentId"), ((BigDecimal) r.get("amount")).intValue()))
                .toList();
    }

    private static Map.Entry<Long, Integer> entry(Long id, int amount) {
        return Map.entry(id, amount);
    }
}
