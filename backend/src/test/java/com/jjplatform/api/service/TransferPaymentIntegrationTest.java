package com.jjplatform.api.service;

import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.TransferReviewDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Monthly fee paid by bank transfer: the student / guardian uploads the receipt from the portal, it
 * waits in the staff review queue, and staff approve it (→ PAID) or reject it with a reason (the
 * student sends it again). Same family as {@link FamilyPaymentIntegrationTest}: papá ($50.000), hijo 1
 * ($35.000 − $15.000 family discount = $20.000) and hijo 2 ($35.000).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:transferpayment;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "app.file.upload-dir=${java.io.tmpdir}/jjp-transfer-test-uploads"
})
class TransferPaymentIntegrationTest {

    static final int MONTH = 10, YEAR = 2026;

    @Autowired PortalService portal;
    @Autowired TransferService transfers;
    @Autowired PaymentGatewayService gateway;
    @Autowired PaymentService paymentService;
    @Autowired PaymentRepository paymentRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired TransactionTemplate tx;

    @MockBean RestTemplate restTemplate;
    @MockBean SecurityHelper securityHelper;
    @MockBean PaymentNotificationService notifications;

    final Map<String, Map<String, Object>> khipu = new HashMap<>();
    final List<String> cancelled = new ArrayList<>();
    final AtomicInteger seq = new AtomicInteger();
    static final AtomicInteger academies = new AtomicInteger();

    Long academyId, papa, hijo1, hijo2;
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
        User owner = userRepository.save(User.builder().email("towner" + n + "@test.cl").password("x").role(User.Role.ADMIN).build());
        Academy a = academyRepository.save(Academy.builder().user(owner).name("Academia T" + n).khipuApiKey("test-key")
                .bankDetails("Banco Estado · Cuenta RUT 12345678 · Academia").build());
        academyId = a.getId();
        Plan adult = planRepository.save(Plan.builder().academy(a).name("Adulto").price(50000).displayOrder(1).build());
        Plan kids = planRepository.save(Plan.builder().academy(a).name("Kids").price(35000).displayOrder(2).build());

        papaUser = userRepository.save(User.builder().email("tpapa" + n + "@test.cl").password("x").role(User.Role.STUDENT).build());
        papa = studentRepository.save(Student.builder().academy(a).name("Papá").user(papaUser).active(true)
                .plans(new ArrayList<>(List.of(adult))).build()).getId();
        hijo1 = studentRepository.save(Student.builder().academy(a).name("Hijo 1").active(true)
                .plans(new ArrayList<>(List.of(kids))).guardians(new java.util.HashSet<>(Set.of(papaUser)))
                .monthlyDiscount(BigDecimal.valueOf(15000)).monthlyDiscountType("AMOUNT").monthlyDiscountReason("Descuento familiar")
                .build()).getId();
        hijo2 = studentRepository.save(Student.builder().academy(a).name("Hijo 2").active(true)
                .plans(new ArrayList<>(List.of(kids))).guardians(new java.util.HashSet<>(Set.of(papaUser))).build()).getId();

        when(securityHelper.getCurrentUser()).thenReturn(papaUser);
    }

    // ── Caso 1: un comprobante de un mes, la academia lo aprueba ──
    @Test
    void singleReceiptIsReviewedAndApproved() throws IOException {
        submit(papa, null);

        Payment p = row(papa);
        assertThat(p.getStatus()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(p.getMethod()).isEqualTo("TRANSFER");
        assertThat(p.getAmount()).isEqualByComparingTo("50000");
        assertThat(p.getProofUrl()).contains("/api/files/");
        assertThat(portalDto(papa).getOnlineState()).isEqualTo("IN_REVIEW");
        // In review: no longer offered to pay, and not shown as money received yet.
        assertThat(due()).extracting(Map.Entry::getKey).doesNotContain(papa);
        assertThat(run(() -> transfers.pendingReviews(academyId))).singleElement().satisfies(r -> {
            assertThat(r.getItems()).hasSize(1);
            assertThat(r.getTotal()).isEqualByComparingTo("50000");
            assertThat(r.getPayerGuardian()).isFalse();
        });
        verify(notifications).notifyTransferSubmitted(List.of(p.getId()));

        transfers.approve(p.getId(), academyId, null);

        Payment paid = row(papa);
        assertThat(paid.getStatus()).isEqualTo("PAID");
        assertThat(paid.getPaidAt()).isEqualTo(paid.getCheckoutStartedAt());
        assertThat(portalDto(papa).getRemaining()).isEqualByComparingTo("0");
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
        verify(notifications).notifyTransferApproved(List.of(p.getId()));
    }

    // ── Caso 2: el apoderado transfiere una sola vez por él y sus 2 hijos ──
    @Test
    void oneReceiptForTheWholeFamilyIsApprovedAtOnce() throws IOException {
        submit(papa, List.of(papa, hijo1, hijo2));

        List<TransferReviewDto> queue = run(() -> transfers.pendingReviews(academyId));
        assertThat(queue).singleElement().satisfies(r -> {
            assertThat(r.getItems()).hasSize(3);
            assertThat(r.getTotal()).isEqualByComparingTo("105000");
        });
        assertThat(row(papa).getProofUrl()).isEqualTo(row(hijo2).getProofUrl());

        transfers.approve(queue.get(0).getPaymentId(), academyId, null);

        for (Long id : List.of(papa, hijo1, hijo2)) assertThat(row(id).getStatus()).isEqualTo("PAID");
        assertThat(row(hijo1).getAmount()).isEqualByComparingTo("20000");
    }

    // ── Caso 3: rechazado con motivo, el alumno lo reenvía y vuelve a revisión ──
    @Test
    void rejectedReceiptCanBeSentAgain() throws IOException {
        submit(hijo2, null);
        String firstProof = row(hijo2).getProofUrl();

        transfers.reject(row(hijo2).getId(), academyId, "No vemos la transferencia en la cartola");

        PaymentDto rejected = portalDto(hijo2);
        assertThat(rejected.getOnlineState()).isEqualTo("REJECTED");
        assertThat(rejected.getReviewNote()).isEqualTo("No vemos la transferencia en la cartola");
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
        assertThat(due()).contains(Map.entry(hijo2, 35000)); // payable again
        // Already reviewed: approving the old receipt is refused.
        assertThatThrownBy(() -> transfers.approve(row(hijo2).getId(), academyId, null))
                .isInstanceOf(IllegalArgumentException.class);

        submit(hijo2, null);

        PaymentDto again = portalDto(hijo2);
        assertThat(again.getOnlineState()).isEqualTo("IN_REVIEW");
        assertThat(again.getReviewNote()).isNull();
        assertThat(again.getProofUrl()).isNotEqualTo(firstProof);
        assertThat(Files.exists(storedFile(firstProof))).as("replaced receipt is deleted").isFalse();
        assertThat(Files.exists(storedFile(again.getProofUrl()))).isTrue();
    }

    // ── Caso 4: tenía un Khipu a medias; al enviar el comprobante se anula ese link ──
    @Test
    void receiptCancelsAnUnfinishedKhipuCheckout() throws IOException {
        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();

        submit(papa, null);

        assertThat(cancelled).containsExactly(kp);
        Payment p = row(papa);
        assertThat(p.getMethod()).isEqualTo("TRANSFER");
        assertThat(p.getGatewayPaymentId()).isNull();
        // And a new Khipu attempt can't overwrite the receipt under review.
        assertThatThrownBy(() -> run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("revisando");
    }

    // ── Caso 5: llegó menos plata: se aprueba por lo recibido y queda saldo ──
    @Test
    void approvingAPartialAmountLeavesABalance() throws IOException {
        submit(papa, null);
        Long id = row(papa).getId();

        assertThatThrownBy(() -> transfers.approve(id, academyId, BigDecimal.valueOf(60000)))
                .isInstanceOf(IllegalArgumentException.class);
        transfers.approve(id, academyId, BigDecimal.valueOf(30000));

        PaymentDto dto = portalDto(papa);
        assertThat(dto.getStatus()).isEqualTo("PAID");
        assertThat(dto.getAmount()).isEqualByComparingTo("30000");
        assertThat(dto.getRemaining()).isEqualByComparingTo("20000");
    }

    // ── Caso 6: el staff de otra academia no puede revisar el comprobante ──
    @Test
    void otherAcademyCannotReviewTheReceipt() throws IOException {
        submit(papa, null);
        Long id = row(papa).getId();
        assertThatThrownBy(() -> transfers.approve(id, academyId + 999, null)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> transfers.reject(id, academyId + 999, "x")).isInstanceOf(ResourceNotFoundException.class);
        assertThat(row(papa).getStatus()).isEqualTo("PENDING_CONFIRMATION");
    }

    // ── Caso 7: sin datos bancarios publicados, la transferencia no se ofrece ──
    @Test
    void academyWithoutBankDetailsRefusesReceipts() {
        tx.executeWithoutResult(s -> academyRepository.findById(academyId).ifPresent(a -> a.setBankDetails(" ")));
        assertThat(run(() -> portal.getPaymentOptions(papa)).get("transfer")).isEqualTo(false);
        assertThatThrownBy(() -> submit(papa, null)).isInstanceOf(IllegalArgumentException.class);
        assertThat(row(papa)).isNull();
    }

    // ══ Khipu + transferencia conviviendo: Khipu no debe romperse por el flujo nuevo ══

    // ── Caso 8: Khipu sin tocar transferencias sigue funcionando igual ──
    @Test
    void plainKhipuPaymentStillWorks() {
        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(50000);
        assertThat(portalDto(papa).getOnlineState()).isEqualTo("IN_PROGRESS");

        payAndNotify(row(papa).getId(), kp);

        assertPaidByKhipu(papa, kp, 50000);
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
    }

    // ── Caso 9: comprobante rechazado → paga con Khipu sin problema ──
    @Test
    void khipuWorksAfterARejectedTransfer() throws IOException {
        submit(papa, null);
        transfers.reject(row(papa).getId(), academyId, "No llegó");

        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();
        PaymentDto attempt = portalDto(papa);
        assertThat(attempt.getOnlineState()).isEqualTo("IN_PROGRESS");
        assertThat(attempt.getReviewNote()).as("old rejection no longer shown").isNull();

        payAndNotify(row(papa).getId(), kp);

        assertPaidByKhipu(papa, kp, 50000);
    }

    // ── Caso 10: el link de Khipu ya estaba pagado cuando sube el comprobante → queda pagado por Khipu ──
    @Test
    void khipuPaidJustBeforeTheReceiptWins() {
        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();
        khipu.get(kp).put("status", "done"); // paid, but the webhook hasn't arrived yet

        assertThatThrownBy(() -> submit(papa, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya está pagado");

        assertPaidByKhipu(papa, kp, 50000);
        assertThat(cancelled).isEmpty();
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
    }

    // ── Caso 11: aviso tardío de Khipu sobre un mes con comprobante en revisión → pagado por Khipu, sale de la cola ──
    @Test
    void lateKhipuWebhookOverAReceiptInReviewPaysTheMonth() throws IOException {
        run(() -> portal.createCheckout(papa, "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();
        Long id = row(papa).getId();
        submit(papa, null);                     // cancels the link...
        khipu.get(kp).put("status", "done");    // ...but the bank had already accepted it

        tx.executeWithoutResult(s -> gateway.handleKhipuWebhook(id, kp));

        assertPaidByKhipu(papa, kp, 50000);
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
        assertThatThrownBy(() -> transfers.approve(id, academyId, null)).isInstanceOf(IllegalArgumentException.class);
    }

    // ── Caso 12: "pagar todo" con Khipu deja fuera al hijo cuyo comprobante está en revisión ──
    @Test
    void familyKhipuSkipsTheChildWithAReceiptInReview() throws IOException {
        submit(hijo2, null);
        assertThat(due()).containsExactly(Map.entry(papa, 50000), Map.entry(hijo1, 20000));

        run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1), "KHIPU", MONTH, YEAR, false, null));
        String kp = "kp" + seq.get();
        assertThat(khipu.get(kp).get("amount")).isEqualTo(70000);
        payAndNotify(row(papa).getId(), kp);

        assertPaidByKhipu(papa, kp, 50000);
        assertPaidByKhipu(hijo1, kp, 20000);
        assertThat(portalDto(hijo2).getOnlineState()).isEqualTo("IN_REVIEW");
        assertThat(run(() -> transfers.pendingReviews(academyId))).singleElement()
                .satisfies(r -> assertThat(r.getItems()).extracting(TransferReviewDto.Item::getStudentId).containsExactly(hijo2));
    }

    // ── Caso 13: pantalla vieja que aún incluye al hijo en revisión → se rechaza sin dejar filas a medias ──
    @Test
    void staleFamilyKhipuIncludingAChildInReviewIsRefusedCleanly() throws IOException {
        submit(hijo2, null);
        int khipuCalls = seq.get();

        assertThatThrownBy(() -> run(() -> portal.createFamilyCheckout(papa, List.of(papa, hijo1, hijo2), "KHIPU", MONTH, YEAR, false, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("revisando");

        assertThat(seq.get()).as("no Khipu payment was created").isEqualTo(khipuCalls);
        assertThat(row(papa)).isNull();
        assertThat(row(hijo1)).isNull();
        assertThat(portalDto(hijo2).getOnlineState()).isEqualTo("IN_REVIEW");
    }

    // ── Caso 14: la academia registra el pago a mano mientras el comprobante está en revisión ──
    @Test
    void staffRecordingByHandClosesTheReview() throws IOException {
        submit(papa, null);
        PaymentDto manual = new PaymentDto();
        manual.setStudentId(papa);
        manual.setAmount(BigDecimal.valueOf(50000));
        manual.setMonth(MONTH);
        manual.setYear(YEAR);

        paymentService.createPayment(manual, academyId);

        assertThat(row(papa).getStatus()).isEqualTo("PAID");
        assertThat(run(() -> transfers.pendingReviews(academyId))).isEmpty();
        assertThat(run(() -> paymentService.getPaymentsByMonth(academyId, MONTH, YEAR))).hasSize(1);
    }

    // ── Caso 15: lo que ve el staff en la lista del mes: solo plata confirmada ──
    @Test
    void staffMonthListShowsOnlyConfirmedMoney() throws IOException {
        submit(papa, null);
        run(() -> portal.createCheckout(hijo1, "KHIPU", MONTH, YEAR, false, null));
        assertThat(run(() -> paymentService.getPaymentsByMonth(academyId, MONTH, YEAR))).isEmpty();

        transfers.approve(row(papa).getId(), academyId, null);
        payAndNotify(row(hijo1).getId(), "kp" + seq.get());

        List<PaymentDto> month = run(() -> paymentService.getPaymentsByMonth(academyId, MONTH, YEAR));
        assertThat(month).extracting(PaymentDto::getMethod).containsExactlyInAnyOrder("TRANSFER", "KHIPU");
        assertThat(month).filteredOn(d -> "TRANSFER".equals(d.getMethod())).singleElement()
                .satisfies(d -> {
                    assertThat(d.getProofUrl()).isNotNull();
                    assertThat(d.getOperationId()).isNull();
                });
    }

    // ── helpers ──

    private void payAndNotify(Long paymentId, String kp) {
        khipu.get(kp).put("status", "done");
        tx.executeWithoutResult(s -> gateway.handleKhipuWebhook(paymentId, kp));
    }

    private void assertPaidByKhipu(Long studentId, String kp, int amount) {
        Payment p = row(studentId);
        assertThat(p.getStatus()).as("status of %s", studentId).isEqualTo("PAID");
        assertThat(p.getMethod()).isEqualTo("KHIPU");
        assertThat(p.getGatewayPaymentId()).isEqualTo(kp);
        assertThat(p.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(amount));
        assertThat(portalDto(studentId).getOperationId()).isEqualTo(kp);
    }

    private void submit(Long studentId, List<Long> studentIds) throws IOException {
        portal.submitTransfer(studentId, studentIds, MONTH, YEAR, receipt());
    }

    private static MockMultipartFile receipt() throws IOException {
        BufferedImage img = new BufferedImage(400, 800, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return new MockMultipartFile("file", "comprobante.png", "image/png", out.toByteArray());
    }

    private Path storedFile(String url) {
        return Path.of(System.getProperty("java.io.tmpdir"), "jjp-transfer-test-uploads", url.substring(url.lastIndexOf('/') + 1));
    }

    private <T> T run(Supplier<T> call) {
        return tx.execute(s -> call.get());
    }

    private Payment row(Long studentId) {
        return paymentRepository.findByStudentIdAndMonthAndYear(studentId, MONTH, YEAR).orElse(null);
    }

    private PaymentDto portalDto(Long studentId) {
        return run(() -> portal.getPayments(studentId)).stream()
                .filter(d -> d.getMonth() == MONTH && d.getYear() == YEAR).findFirst().orElseThrow();
    }

    private List<Map.Entry<Long, Integer>> due() {
        return due(papa);
    }

    private List<Map.Entry<Long, Integer>> due(Long from) {
        return run(() -> portal.getFamilyDue(from, MONTH, YEAR)).stream()
                .map(r -> Map.entry((Long) r.get("studentId"), ((java.math.BigDecimal) r.get("amount")).intValue()))
                .toList();
    }
}
