package com.jjplatform.api.service;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.ClassmateDto;
import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Backs the student portal. Every method resolves the student from the supplied id and verifies it is
 * linked to the logged-in STUDENT user, so a student can only ever read/modify their own record(s),
 * never another student's by guessing an id.
 */
@Service
@RequiredArgsConstructor
public class PortalService {

    // Scenic (CSS/SVG) + photographic (served from the frontend /public/portadas) cover options.
    // Keep in sync with frontend portalBanners.tsx.
    private static final Set<String> ALLOWED_BANNERS = Set.of(
            "japones", "olas", "torii", "jiujitsu", "minimal",
            "samuraiwarrior", "mujer", "mujer2", "tiburon", "tortugasninjas");

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final StudentDisciplineService studentDisciplineService;
    private final BeltPromotionService beltPromotionService;
    private final PaymentService paymentService;
    private final FileStorageService fileStorageService;
    private final TrainingService trainingService;
    private final StudentService studentService;
    private final DuelService duelService;

    @Value("${app.base-url}")
    private String baseUrl;

    /** Current student's portal banner preference (null when none chosen). */
    public String getBanner() {
        return securityHelper.getCurrentUser().getPortalBanner();
    }

    /** Sets (or clears, with null/blank) the portal banner for the logged-in student. */
    @Transactional
    public String setBanner(String banner) {
        String value = (banner == null || banner.isBlank()) ? null : banner.trim().toLowerCase();
        if (value != null && !ALLOWED_BANNERS.contains(value)) {
            throw new IllegalArgumentException("Diseño de portada no válido.");
        }
        User user = userRepository.findById(securityHelper.getCurrentUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setPortalBanner(value);
        userRepository.save(user);
        return value;
    }

    /** Loads a student that must belong to the current portal user, or 404s. */
    private Student requireOwnedStudent(Long studentId) {
        Long userId = securityHelper.getCurrentUser().getId();
        Student s = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        if (s.getUser() == null || !s.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Alumno no encontrado");
        }
        return s;
    }

    public List<StudentDisciplineDto> getDisciplines(Long studentId) {
        requireOwnedStudent(studentId);
        return studentDisciplineService.getByStudent(studentId);
    }

    public List<BeltPromotionDto> getBeltPromotions(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return beltPromotionService.getAllByStudent(studentId, s.getAcademy().getId());
    }

    public List<PaymentDto> getPayments(Long studentId) {
        requireOwnedStudent(studentId);
        return paymentService.getPaymentsByStudent(studentId);
    }

    /** Stores a new profile photo for the owned student and returns its public URL. */
    @Transactional
    public String updatePhoto(Long studentId, MultipartFile file) throws IOException {
        Student s = requireOwnedStudent(studentId);

        String filename = fileStorageService.store(file, ImageValidator.Profile.PROFILE);
        String url = baseUrl + "/api/files/" + filename;

        String old = s.getPhotoUrl();
        if (old != null && old.contains("/api/files/")) {
            try {
                fileStorageService.delete(old.substring(old.lastIndexOf('/') + 1));
            } catch (IOException ignored) {
                // Old file may already be gone; the new photo is what matters.
            }
        }

        s.setPhotoUrl(url);
        studentRepository.save(s);
        return url;
    }

    // --- Personal training journal (self-logged sessions + streak) ---------

    public TrainingSummaryDto getTrainingSummary(Long studentId, LocalDate clientToday) {
        requireOwnedStudent(studentId);
        Integer goal = securityHelper.getCurrentUser().getTrainingWeeklyGoal();
        return trainingService.summary(studentId, goal, clientToday);
    }

    /** Spends a monthly streak repair to fill the student's current 1-day gap. */
    public TrainingSummaryDto repairStreak(Long studentId, LocalDate clientToday) {
        Student me = requireOwnedStudent(studentId);
        Integer goal = securityHelper.getCurrentUser().getTrainingWeeklyGoal();
        return trainingService.repairStreak(me, goal, clientToday);
    }

    public List<TrainingSessionDto> getTrainingSessions(Long studentId) {
        requireOwnedStudent(studentId);
        return trainingService.listByStudent(studentId);
    }

    /** Classmates (same academy as the owned student) for the training-partner picker. */
    public List<ClassmateDto> getClassmates(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return studentService.getAcademyClassmates(s.getAcademy().getId(), studentId);
    }

    // --- Duels (challenges between classmates) -----------------------------

    public DuelDto createDuel(Long studentId, CreateDuelRequest req) {
        Student me = requireOwnedStudent(studentId);
        return duelService.create(me, req);
    }

    public List<DuelDto> getDuels(Long studentId) {
        requireOwnedStudent(studentId);
        return duelService.listForStudent(studentId);
    }

    public List<DuelDto> getDuelFeed(Long studentId) {
        Student me = requireOwnedStudent(studentId);
        return duelService.feed(me.getAcademy().getId());
    }

    public DuelDto respondDuel(Long studentId, Long duelId, boolean accept) {
        Student me = requireOwnedStudent(studentId);
        return duelService.respond(me, duelId, accept);
    }

    public DuelDto reportDuelResult(Long studentId, Long duelId, DuelResultRequest req) {
        Student me = requireOwnedStudent(studentId);
        return duelService.reportResult(me, duelId, req);
    }

    public void cancelDuel(Long studentId, Long duelId) {
        Student me = requireOwnedStudent(studentId);
        duelService.cancel(me, duelId);
    }

    public TrainingSessionDto createTrainingSession(Long studentId, TrainingSessionDto dto) {
        Student s = requireOwnedStudent(studentId);
        return trainingService.create(s, dto);
    }

    public void deleteTrainingSession(Long studentId, Long sessionId) {
        requireOwnedStudent(studentId);
        trainingService.delete(studentId, sessionId);
    }

    /** Current student's weekly training goal (null when not set). */
    public Integer getTrainingGoal() {
        return securityHelper.getCurrentUser().getTrainingWeeklyGoal();
    }

    /** Sets (1-7) or clears (null) the weekly training goal for the logged-in student. */
    @Transactional
    public Integer setTrainingGoal(Integer goal) {
        Integer value = goal;
        if (value != null && (value < 1 || value > 7)) {
            throw new IllegalArgumentException("La meta semanal debe estar entre 1 y 7.");
        }
        User user = userRepository.findById(securityHelper.getCurrentUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setTrainingWeeklyGoal(value);
        userRepository.save(user);
        return value;
    }
}
