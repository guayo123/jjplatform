package com.jjplatform.api.service;

import com.jjplatform.api.dto.AtRiskStudentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.TrainingSession;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Churn-risk detection: flags students who stopped training or haven't paid the current month,
 * and (when the academy opts in) auto-sends WhatsApp payment reminders on a daily schedule.
 */
@Service
@RequiredArgsConstructor
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    /** A student is "inactive" after this many days without a logged training session. */
    private static final int INACTIVE_DAYS = 21;
    /** Don't auto-remind before this day of the month (grace period after the fee falls due). */
    private static final int REMINDER_GRACE_DAY = 5;

    private final StudentRepository studentRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final PaymentRepository paymentRepository;
    private final AcademyRepository academyRepository;
    private final WhatsAppService whatsAppService;

    @Transactional(readOnly = true)
    public List<AtRiskStudentDto> getAtRisk(Long academyId) {
        LocalDate today = LocalDate.now();
        return studentRepository.findByAcademyIdAndActiveTrue(academyId).stream()
                .map(s -> evaluate(s, today))
                .filter(d -> d.isInactive() || d.isOverduePayment())
                .toList();
    }

    private AtRiskStudentDto evaluate(Student s, LocalDate today) {
        List<TrainingSession> sessions = trainingSessionRepository
                .findByStudentIdOrderByDateDescCreatedAtDesc(s.getId());
        LocalDate last = sessions.isEmpty() ? null : sessions.get(0).getDate();
        Integer days = last == null ? null : (int) ChronoUnit.DAYS.between(last, today);
        boolean inactive = last == null || days >= INACTIVE_DAYS;
        return AtRiskStudentDto.builder()
                .studentId(s.getId())
                .name(s.getName())
                .phone(s.getPhone())
                .photoUrl(s.getPhotoUrl())
                .lastSessionDate(last != null ? last.toString() : null)
                .daysSinceLastSession(days)
                .inactive(inactive)
                .overduePayment(isOverdue(s.getId(), today))
                .build();
    }

    /** Overdue = no PAID payment recorded for the current month. */
    private boolean isOverdue(Long studentId, LocalDate today) {
        return paymentRepository.findByStudentIdAndMonthAndYear(studentId, today.getMonthValue(), today.getYear())
                .map(p -> !"PAID".equals(p.getStatus()))
                .orElse(true);
    }

    /** Sends one WhatsApp reminder to a single overdue student now (manual trigger by staff). */
    @Transactional
    public void remindStudent(Long studentId, Long academyId) {
        Student s = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        if (!s.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Alumno no encontrado");
        }
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academia no encontrada"));
        if (!sendReminder(academy, s)) {
            throw new IllegalStateException("No se pudo enviar: revisa el WhatsApp de la academia y el teléfono del alumno.");
        }
        s.setLastPaymentReminderAt(LocalDate.now());
        studentRepository.save(s);
    }

    /**
     * Daily sweep (called by the scheduled job): for every academy that enabled reminders and has
     * WhatsApp configured, message overdue students once per month. Deduped via lastPaymentReminderAt.
     */
    @Transactional
    public void sendDueReminders() {
        LocalDate today = LocalDate.now();
        if (today.getDayOfMonth() < REMINDER_GRACE_DAY) return;

        for (Academy academy : academyRepository.findAll()) {
            if (!Boolean.TRUE.equals(academy.getPaymentRemindersEnabled())) continue;
            if (!whatsAppConfigured(academy)) continue;

            for (Student s : studentRepository.findByAcademyIdAndActiveTrue(academy.getId())) {
                if (s.getPhone() == null || s.getPhone().isBlank()) continue;
                if (alreadyRemindedThisMonth(s, today)) continue;
                if (!isOverdue(s.getId(), today)) continue;
                if (sendReminder(academy, s)) {
                    s.setLastPaymentReminderAt(today);
                    studentRepository.save(s);
                }
            }
        }
    }

    private boolean alreadyRemindedThisMonth(Student s, LocalDate today) {
        LocalDate last = s.getLastPaymentReminderAt();
        return last != null && last.getYear() == today.getYear() && last.getMonthValue() == today.getMonthValue();
    }

    private boolean whatsAppConfigured(Academy a) {
        return a.getWpPhoneNumberId() != null && !a.getWpPhoneNumberId().isBlank()
                && a.getWpAccessToken() != null && !a.getWpAccessToken().isBlank();
    }

    private boolean sendReminder(Academy academy, Student s) {
        if (s.getPhone() == null || s.getPhone().isBlank() || !whatsAppConfigured(academy)) return false;
        String firstName = s.getName().trim().split("\\s+")[0];
        String text = "Hola " + firstName + " 👋 Te recordamos tu mensualidad en " + academy.getName()
                + ". Puedes pagarla desde la app del alumno. ¡Te esperamos en el tatami! 🥋";
        try {
            whatsAppService.sendMessage(academy.getWpPhoneNumberId(), academy.getWpAccessToken(), s.getPhone(), text);
            return true;
        } catch (Exception e) {
            log.warn("Payment reminder to student {} failed: {}", s.getId(), e.getMessage());
            return false;
        }
    }
}
