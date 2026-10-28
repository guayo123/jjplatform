package com.jjplatform.api.controller;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import com.jjplatform.api.service.PaymentNotificationService;
import com.jjplatform.api.service.SecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The transfer flow through the real HTTP layer: multipart upload from the portal, role checks on the
 * staff endpoints, and the JSON the screens read.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:transferendpoints;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=MONTH,YEAR,VALUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "app.file.upload-dir=${java.io.tmpdir}/jjp-transfer-endpoint-uploads"
})
@AutoConfigureMockMvc
class TransferEndpointsIntegrationTest {

    static final int MONTH = 10, YEAR = 2026;
    static final AtomicInteger n = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired AcademyRepository academyRepository;
    @Autowired PlanRepository planRepository;
    @Autowired StudentRepository studentRepository;
    @Autowired UserRepository userRepository;
    @Autowired PaymentRepository paymentRepository;

    @MockBean RestTemplate restTemplate;
    @MockBean SecurityHelper securityHelper;
    @MockBean PaymentNotificationService notifications;

    Long academyId, studentId;
    User studentUser;

    @BeforeEach
    void setUp() {
        int i = n.incrementAndGet();
        User owner = userRepository.save(User.builder().email("eowner" + i + "@test.cl").password("x").role(User.Role.ADMIN).build());
        Academy a = academyRepository.save(Academy.builder().user(owner).name("Academia E" + i)
                .bankDetails("Banco Estado · Cuenta RUT 1234").build());
        academyId = a.getId();
        Plan plan = planRepository.save(Plan.builder().academy(a).name("Adulto").price(45000).displayOrder(1).build());
        studentUser = userRepository.save(User.builder().email("ealumno" + i + "@test.cl").password("x").role(User.Role.STUDENT).build());
        studentId = studentRepository.save(Student.builder().academy(a).name("Alumno E").user(studentUser).active(true)
                .plans(new ArrayList<>(List.of(plan))).build()).getId();
        when(securityHelper.getCurrentUser()).thenReturn(studentUser);
        when(securityHelper.getCurrentAcademyId()).thenReturn(academyId);
    }

    @Test
    void studentUploadsAndStaffApprovesOverHttp() throws Exception {
        mvc.perform(get("/api/portal/students/{id}/payment-options", studentId).with(user("s").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transfer").value(true))
                .andExpect(jsonPath("$.bankDetails").value("Banco Estado · Cuenta RUT 1234"));

        upload().andExpect(status().isNoContent());

        mvc.perform(get("/api/portal/students/{id}/payments", studentId).with(user("s").roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].onlineState").value("IN_REVIEW"))
                .andExpect(jsonPath("$[0].method").value("TRANSFER"));

        // A student can't see the queue nor approve their own receipt.
        mvc.perform(get("/api/payments/transfers/pending").with(user("s").roles("STUDENT")))
                .andExpect(status().isForbidden());
        Long paymentId = paymentRepository.findByStudentIdAndMonthAndYear(studentId, MONTH, YEAR).orElseThrow().getId();
        mvc.perform(post("/api/payments/{id}/transfer/approve", paymentId).with(user("s").roles("STUDENT")))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/payments/transfers/pending").with(user("a").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].paymentId").value(paymentId))
                .andExpect(jsonPath("$[0].total").value(45000))
                .andExpect(jsonPath("$[0].items[0].studentName").value("Alumno E"))
                .andExpect(jsonPath("$[0].proofUrl").isNotEmpty());

        // Approve without a body (the admin screen sends {} for the full amount).
        mvc.perform(post("/api/payments/{id}/transfer/approve", paymentId).with(user("p").roles("PROFESOR"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/payments").param("month", "" + MONTH).param("year", "" + YEAR).with(user("a").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PAID"))
                .andExpect(jsonPath("$[0].method").value("TRANSFER"))
                .andExpect(jsonPath("$[0].remaining").value(0));
        mvc.perform(get("/api/payments/transfers/pending").with(user("a").roles("ADMIN")))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectWithReasonOverHttp() throws Exception {
        upload().andExpect(status().isNoContent());
        Long paymentId = paymentRepository.findByStudentIdAndMonthAndYear(studentId, MONTH, YEAR).orElseThrow().getId();

        mvc.perform(post("/api/payments/{id}/transfer/reject", paymentId).with(user("a").roles("ENCARGADO"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"El monto no coincide\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/portal/students/{id}/payments", studentId).with(user("s").roles("STUDENT")))
                .andExpect(jsonPath("$[0].onlineState").value("REJECTED"))
                .andExpect(jsonPath("$[0].reviewNote").value("El monto no coincide"));
    }

    @Test
    void notAnImageIsRefusedWithAClearMessage() throws Exception {
        MockMultipartFile pdf = new MockMultipartFile("file", "comprobante.pdf", "application/pdf", "%PDF-1.4 fake pdf".getBytes());
        mvc.perform(multipart("/api/portal/students/{id}/transfer", studentId).file(pdf)
                        .param("month", "" + MONTH).param("year", "" + YEAR)
                        .with(user("s").roles("STUDENT")))
                .andExpect(status().isBadRequest());
        assertThat(paymentRepository.findByStudentIdAndMonthAndYear(studentId, MONTH, YEAR)).isEmpty();
    }

    @Test
    void familyIdsArriveAsACommaSeparatedList() throws Exception {
        // Same shape the portal sends for "pagar todo": studentIds=1,2 (here just the student itself).
        mvc.perform(multipart("/api/portal/students/{id}/transfer", studentId).file(receipt())
                        .param("month", "" + MONTH).param("year", "" + YEAR).param("studentIds", studentId + "")
                        .with(user("s").roles("STUDENT")))
                .andExpect(status().isNoContent());
    }

    private org.springframework.test.web.servlet.ResultActions upload() throws Exception {
        return mvc.perform(multipart("/api/portal/students/{id}/transfer", studentId).file(receipt())
                .param("month", "" + MONTH).param("year", "" + YEAR)
                .with(user("s").roles("STUDENT")));
    }

    private static MockMultipartFile receipt() throws IOException {
        BufferedImage img = new BufferedImage(600, 1200, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", out);
        return new MockMultipartFile("file", "comprobante.jpg", "image/jpeg", out.toByteArray());
    }
}
