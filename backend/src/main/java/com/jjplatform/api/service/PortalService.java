package com.jjplatform.api.service;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.ClassmateDto;
import com.jjplatform.api.dto.StudentCardDto;
import com.jjplatform.api.dto.CompetitionResultDto;
import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.dto.LeaderboardEntryDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.dto.TechniqueCurriculumDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.UpcomingClassDto;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final TechniqueService techniqueService;
    private final PaymentGatewayService paymentGatewayService;
    private final ClassReservationService classReservationService;

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

    /** Portal self-service: student adds a competition result to one of their own disciplines. */
    public CompetitionResultDto addCompetitionResult(Long studentId, Long studentDisciplineId, CompetitionResultDto dto) {
        Student s = requireOwnedStudent(studentId);
        return studentDisciplineService.addResultForStudent(studentDisciplineId, s.getAcademy().getId(), studentId, dto);
    }

    /** Portal self-service: student edits one of their own competition results. */
    public CompetitionResultDto updateCompetitionResult(Long studentId, Long resultId, CompetitionResultDto dto) {
        Student s = requireOwnedStudent(studentId);
        return studentDisciplineService.updateResultForStudent(resultId, s.getAcademy().getId(), studentId, dto);
    }

    public List<BeltPromotionDto> getBeltPromotions(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return beltPromotionService.getAllByStudent(studentId, s.getAcademy().getId());
    }

    public List<PaymentDto> getPayments(Long studentId) {
        requireOwnedStudent(studentId);
        return paymentService.getPaymentsByStudent(studentId);
    }

    /** Online-payment methods the academy offers + bank-transfer instructions, for the portal. */
    public Map<String, Object> getPaymentOptions(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        Map<String, Boolean> methods = paymentGatewayService.availableMethods(s.getAcademy().getId());
        Map<String, Object> out = new HashMap<>();
        out.put("khipu", methods.get("khipu"));
        out.put("mercadoPago", methods.get("mercadoPago"));
        out.put("bankDetails", s.getAcademy().getBankDetails());
        return out;
    }

    /** Starts a gateway checkout for the student's monthly fee; returns the URL to open. */
    public String createCheckout(Long studentId, String method, int month, int year) {
        Student s = requireOwnedStudent(studentId);
        return paymentGatewayService.createCheckout(studentId, s.getAcademy().getId(), month, year, method);
    }

    // --- Class reservations -------------------------------------------------

    public List<UpcomingClassDto> getUpcomingClasses(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return classReservationService.getUpcoming(studentId, s.getAcademy().getId());
    }

    public void reserveClass(Long studentId, Long scheduleId, LocalDate date) {
        Student s = requireOwnedStudent(studentId);
        classReservationService.reserve(studentId, s.getAcademy().getId(), scheduleId, date);
    }

    public void cancelClass(Long studentId, Long scheduleId, LocalDate date) {
        Student s = requireOwnedStudent(studentId);
        classReservationService.cancel(studentId, s.getAcademy().getId(), scheduleId, date);
    }

    // --- Technique curriculum ----------------------------------------------

    /** The student's per-belt technique program for every discipline they train. */
    public List<TechniqueCurriculumDto> getTechniqueCurriculum(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return techniqueService.getCurriculum(s);
    }

    /** Marks (or unmarks) a curriculum technique learned for the owned student. */
    public void setTechniqueLearned(Long studentId, Long techniqueId, boolean learned) {
        Student s = requireOwnedStudent(studentId);
        techniqueService.setLearned(s, techniqueId, learned);
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

    /** Academy training leaderboard (sessions this week + streak), scoped to the owned student's academy. */
    public List<LeaderboardEntryDto> getTrainingLeaderboard(Long studentId, LocalDate clientToday) {
        Student s = requireOwnedStudent(studentId);
        return trainingService.leaderboard(s.getAcademy().getId(), clientToday);
    }

    /** Classmates (same academy as the owned student) for the training-partner picker. */
    public List<ClassmateDto> getClassmates(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return studentService.getAcademyClassmates(s.getAcademy().getId(), studentId);
    }

    /** Card of an academy mate (tapped from a ranking). Both must share the owned student's academy. */
    public StudentCardDto getStudentCard(Long studentId, Long targetId) {
        Student s = requireOwnedStudent(studentId);
        return studentService.getStudentCard(s.getAcademy().getId(), targetId);
    }

    /** The student updates their own weight (kg); null clears it. */
    @Transactional
    public Double updateWeight(Long studentId, Double weight) {
        if (weight != null && (weight <= 0 || weight > 400)) {
            throw new IllegalArgumentException("El peso debe estar entre 1 y 400 kg.");
        }
        Student s = requireOwnedStudent(studentId);
        s.setWeight(weight);
        studentRepository.save(s);
        return weight;
    }

    /** Birthdays of the student's academy that fall in the current month. */
    public List<com.jjplatform.api.dto.BirthdayDto> getBirthdaysThisMonth(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return studentService.getAcademyBirthdays(s.getAcademy().getId(), java.time.LocalDate.now().getMonthValue());
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

    /** Top-10 academy duel ranking (wins/losses) for the owned student's academy. */
    public List<com.jjplatform.api.dto.DuelRankingDto> getDuelRanking(Long studentId) {
        Student me = requireOwnedStudent(studentId);
        return duelService.ranking(me.getAcademy().getId());
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
