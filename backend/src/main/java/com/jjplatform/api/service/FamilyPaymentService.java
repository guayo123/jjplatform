package com.jjplatform.api.service;

import com.jjplatform.api.dto.FamilyDueDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Staff side of family payments: when the admin records a payment by hand for a guardian, shows what
 * each record in their charge owes for the month and settles them all at once.
 */
@Service
@RequiredArgsConstructor
public class FamilyPaymentService {

    private final StudentRepository studentRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    /**
     * Active records of the academy in the same family as {@code studentId}: sharing a portal account
     * (own or as guardian), or linked by the guardian RUT typed in the records — so it also works for
     * families that never opened the portal. The student itself always comes first.
     */
    @Transactional(readOnly = true)
    public FamilyDueDto familyDue(Long academyId, Long studentId, int month, int year) {
        Student student = requireStudent(academyId, studentId);
        List<Student> family = familyOf(student);
        Map<Long, Payment> payments = paymentRepository.findByAcademyIdAndMonthAndYear(academyId, month, year).stream()
                .collect(Collectors.toMap(p -> p.getStudent().getId(), Function.identity(), (a, b) -> a));
        Map<Long, PaymentDto> paid = paymentService.getPaymentsByMonth(academyId, month, year).stream()
                .collect(Collectors.toMap(PaymentDto::getStudentId, Function.identity(), (a, b) -> a));

        FamilyDueDto dto = new FamilyDueDto();
        dto.setGuardianName(family.stream().map(Student::getGuardianName)
                .filter(n -> n != null && !n.isBlank()).findFirst().orElse(null));
        for (Student s : family) {
            FamilyDueDto.Member m = new FamilyDueDto.Member();
            m.setStudentId(s.getId());
            m.setName(s.getName());
            PaymentDto p = paid.get(s.getId());
            if (p != null) {
                BigDecimal remaining = p.getRemaining() != null ? p.getRemaining() : BigDecimal.ZERO;
                m.setPaymentId(p.getId());
                m.setPaid(p.getAmount());
                m.setDue(remaining);
                m.setNet(p.getAmount().add(remaining));
                m.setPlanTotal(p.getExpectedAmount());
                m.setStatus(remaining.signum() > 0 ? "PARTIAL" : "PAID");
            } else if (isInReview(payments.get(s.getId()))) {
                m.setStatus("IN_REVIEW");
                m.setNet(payments.get(s.getId()).getAmount());
            } else {
                PaymentService.OnlineDue due = paymentService.onlineDue(s.getId(), month, year);
                if (due == null) {
                    m.setStatus("NO_FEE");
                } else {
                    m.setStatus("PENDING");
                    m.setNet(due.amount());
                    m.setDue(due.amount());
                    m.setPlanTotal(due.planTotal());
                    m.setDiscountReason(due.discountReason());
                }
            }
            if ("PENDING".equals(m.getStatus()) || "PARTIAL".equals(m.getStatus())) {
                dto.setTotalDue(dto.getTotalDue().add(m.getDue()));
            }
            dto.getMembers().add(m);
        }
        return dto;
    }

    /**
     * Records the full balance of the month for the given family members (all that owe when
     * {@code studentIds} is empty): a new payment for those with none, the remaining abono for partial ones.
     */
    @Transactional
    public List<PaymentDto> payAll(Long academyId, Long studentId, Collection<Long> studentIds,
                                   int month, int year, String notes) {
        FamilyDueDto family = familyDue(academyId, studentId, month, year);
        Set<Long> chosen = studentIds == null ? Set.of() : new HashSet<>(studentIds);
        Set<Long> inFamily = family.getMembers().stream().map(FamilyDueDto.Member::getStudentId).collect(Collectors.toSet());
        if (!inFamily.containsAll(chosen)) {
            throw new IllegalArgumentException("Solo se pueden pagar juntos alumnos del mismo grupo familiar.");
        }
        List<PaymentDto> out = new ArrayList<>();
        for (FamilyDueDto.Member m : family.getMembers()) {
            if (!chosen.isEmpty() && !chosen.contains(m.getStudentId())) continue;
            if ("PARTIAL".equals(m.getStatus())) {
                out.add(paymentService.abonarPayment(m.getPaymentId(), m.getDue(), academyId));
            } else if ("PENDING".equals(m.getStatus())) {
                Student s = studentRepository.findById(m.getStudentId()).orElseThrow();
                PaymentDto p = new PaymentDto();
                p.setStudentId(m.getStudentId());
                p.setMonth(month);
                p.setYear(year);
                p.setAmount(m.getDue());
                p.setDiscount(s.getMonthlyDiscount() != null ? s.getMonthlyDiscount() : BigDecimal.ZERO);
                p.setDiscountType("PERCENT".equals(s.getMonthlyDiscountType()) ? "PERCENT" : "AMOUNT");
                p.setNotes(joinNotes(m.getDiscountReason(), notes));
                out.add(paymentService.createPayment(p, academyId));
            }
        }
        if (out.isEmpty()) throw new IllegalArgumentException("No hay saldo pendiente para registrar.");
        return out;
    }

    private List<Student> familyOf(Student student) {
        Set<Long> accounts = new HashSet<>();
        if (student.getUser() != null) accounts.add(student.getUser().getId());
        student.getGuardians().forEach(g -> accounts.add(g.getId()));
        Set<String> ruts = new HashSet<>();
        addRut(ruts, student.getRut());
        addRut(ruts, student.getGuardianRut());

        List<Student> out = new ArrayList<>(List.of(student));
        for (Student s : studentRepository.findByAcademyIdAndActiveTrue(student.getAcademy().getId())) {
            if (s.getId().equals(student.getId())) continue;
            boolean sameAccount = (s.getUser() != null && accounts.contains(s.getUser().getId()))
                    || s.getGuardians().stream().map(User::getId).anyMatch(accounts::contains);
            // Child of this student, its guardian, or a sibling with the same guardian RUT.
            boolean sameRut = ruts.contains(normalizeRut(s.getGuardianRut())) || ruts.contains(normalizeRut(s.getRut()));
            if (sameAccount || sameRut) out.add(s);
        }
        return out;
    }

    private Student requireStudent(Long academyId, Long studentId) {
        Student s = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        if (!s.getAcademy().getId().equals(academyId)) throw new ResourceNotFoundException("Alumno no encontrado");
        return s;
    }

    private static boolean isInReview(Payment p) {
        return p != null && PaymentService.TRANSFER_IN_REVIEW.equals(PaymentService.onlineState(p));
    }

    private static void addRut(Set<String> ruts, String rut) {
        String n = normalizeRut(rut);
        if (n.length() >= 2) ruts.add(n);
    }

    private static String normalizeRut(String rut) {
        return rut == null ? "" : rut.replaceAll("[^0-9kK]", "").toUpperCase();
    }

    private static String joinNotes(String a, String b) {
        String joined = java.util.stream.Stream.of(a, b).filter(Objects::nonNull).map(String::trim)
                .filter(x -> !x.isEmpty()).collect(Collectors.joining(" · "));
        return joined.isEmpty() ? null : joined;
    }
}
