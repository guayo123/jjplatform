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
import com.jjplatform.api.dto.WeightEntryDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.model.WeightEntry;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import com.jjplatform.api.repository.WeightEntryRepository;
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
    private final ConditioningService conditioningService;
    private final StudentService studentService;
    private final DuelService duelService;
    private final TechniqueService techniqueService;
    private final CoachService coachService;
    private final PaymentGatewayService paymentGatewayService;
    private final ClassReservationService classReservationService;
    private final PushService pushService;
    private final WeightEntryRepository weightEntryRepository;
    private final DisciplineRepository disciplineRepository;

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
        User u = securityHelper.getCurrentUser();
        return trainingService.summary(studentId, u.getTrainingWeeklyGoal(), u.getConditioningWeeklyGoal(), clientToday);
    }

    public List<TrainingSessionDto> getTrainingSessions(Long studentId) {
        requireOwnedStudent(studentId);
        return trainingService.listByStudent(studentId);
    }

    /** Both academy leaderboards (🥋 arte marcial + 🏋️ físico), scoped to the owned student's academy. */
    /** Legacy (array) leaderboard — 🥋 arte marcial only. Kept so pre-1.6.3 apps don't crash on the new shape. */
    public List<LeaderboardEntryDto> getTrainingLeaderboard(Long studentId, LocalDate clientToday) {
        Student s = requireOwnedStudent(studentId);
        return trainingService.leaderboard(s.getAcademy().getId(), clientToday);
    }

    /** New tabbed leaderboards {martial, conditioning} for 1.6.3+ clients. */
    public com.jjplatform.api.dto.LeaderboardsDto getTrainingLeaderboards(Long studentId, LocalDate clientToday) {
        Student s = requireOwnedStudent(studentId);
        return trainingService.leaderboards(s.getAcademy().getId(), clientToday);
    }

    /** Premium-only "you vs academy" snapshot. Requires active Pro (exposes academy-wide aggregates). */
    public com.jjplatform.api.dto.ProInsightsDto getProInsights(Long studentId, LocalDate clientToday) {
        Student s = requireOwnedStudent(studentId);
        if (!s.isPremium()) {
            throw new org.springframework.security.access.AccessDeniedException("Pro requerido");
        }
        return trainingService.proInsights(s.getAcademy().getId(), s.getId(), clientToday);
    }

    /** Pro-only: last AI-coach analysis (no generation, no AI call). Requires active Pro. */
    public com.jjplatform.api.dto.CoachInsightDto getCoachInsight(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        requirePremium(s);
        return coachService.current(s);
    }

    /** Pro-only: generate (or return today's cached) AI-coach analysis. Requires active Pro. */
    public com.jjplatform.api.dto.CoachInsightDto generateCoachInsight(Long studentId, LocalDate clientToday) {
        Student s = requireOwnedStudent(studentId);
        requirePremium(s);
        return coachService.generate(s, clientToday);
    }

    private void requirePremium(Student s) {
        if (!s.isPremium()) {
            throw new org.springframework.security.access.AccessDeniedException("Pro requerido");
        }
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

    public com.jjplatform.api.dto.DuelFeedPageDto getDuelFeedPage(Long studentId, String tab, String cursor, int size) {
        Student me = requireOwnedStudent(studentId);
        return duelService.feedPage(me.getAcademy().getId(), tab, cursor, size);
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

    public DuelDto closeDuel(Long studentId, Long duelId, String reason) {
        Student me = requireOwnedStudent(studentId);
        return duelService.closeAccepted(me, duelId, reason);
    }

    /** Registers this device's FCM token for the owned student so it can receive academy pushes. */
    public void registerDevice(Long studentId, String token, String platform) {
        Student me = requireOwnedStudent(studentId);
        pushService.registerToken(me, token, platform);
    }

    public void unregisterDevice(Long studentId, String token) {
        requireOwnedStudent(studentId);
        pushService.removeToken(token);
    }

    public TrainingSessionDto createTrainingSession(Long studentId, TrainingSessionDto dto) {
        Student s = requireOwnedStudent(studentId);
        return trainingService.create(s, dto);
    }

    public void deleteTrainingSession(Long studentId, Long sessionId) {
        requireOwnedStudent(studentId);
        trainingService.delete(studentId, sessionId);
    }

    /** Discipline name used for kickboxing sessions (one per academy, resolved/created on demand). */
    private static final String KICKBOXING_DISCIPLINE = "Kickboxing";

    /**
     * Log a kickboxing session. Available to ALL students (not only those enrolled in a kickboxing
     * discipline): it resolves — or creates once — the academy's "Kickboxing" discipline and stores a
     * regular TrainingSession against it, with no Gi/No-Gi modality. Submissions simply aren't sent.
     */
    public TrainingSessionDto createKickboxingSession(Long studentId, TrainingSessionDto dto) {
        Student s = requireOwnedStudent(studentId);
        Discipline kickboxing = resolveKickboxingDiscipline(s);
        dto.setDisciplineId(kickboxing.getId());
        dto.setModality(null); // striking, not BJJ — no Gi/No-Gi dimension
        return trainingService.create(s, dto);
    }

    private Discipline resolveKickboxingDiscipline(Student student) {
        Long academyId = student.getAcademy().getId();
        return disciplineRepository.findFirstByAcademyIdAndNameIgnoreCase(academyId, KICKBOXING_DISCIPLINE)
                .orElseGet(() -> disciplineRepository.save(Discipline.builder()
                        .academy(student.getAcademy())
                        .name(KICKBOXING_DISCIPLINE)
                        .active(true)
                        .build()));
    }

    // --- Conditioning (strength & physical prep) journal -------------------

    public List<com.jjplatform.api.dto.ConditioningSessionDto> getConditioningSessions(Long studentId) {
        requireOwnedStudent(studentId);
        return conditioningService.listByStudent(studentId);
    }

    public com.jjplatform.api.dto.ConditioningSessionDto createConditioningSession(
            Long studentId, com.jjplatform.api.dto.ConditioningSessionDto dto) {
        Student s = requireOwnedStudent(studentId);
        return conditioningService.create(s, dto);
    }

    public void deleteConditioningSession(Long studentId, Long sessionId) {
        requireOwnedStudent(studentId);
        conditioningService.delete(studentId, sessionId);
    }

    /** Current student's weekly goals: {martial, conditioning} (null values = not set). */
    public Map<String, Integer> getTrainingGoals() {
        User u = securityHelper.getCurrentUser();
        Map<String, Integer> out = new HashMap<>();
        out.put("martial", u.getTrainingWeeklyGoal());
        out.put("conditioning", u.getConditioningWeeklyGoal());
        return out;
    }

    /**
     * Sets (1-7) or clears (null) one weekly goal for the logged-in student.
     * {@code type} is "conditioning" for the físico goal, anything else for the martial goal.
     * Once a goal is set it can only be changed on the first day of the week (Monday), so nobody lowers it
     * mid-week to dodge a goal they're about to miss; the first-ever setup is allowed any day (onboarding).
     * Returns both goals so the client refreshes in one call.
     */
    @Transactional
    public Map<String, Integer> setTrainingGoal(String type, Integer goal, LocalDate clientToday) {
        if (goal != null && (goal < 1 || goal > 7)) {
            throw new IllegalArgumentException("La meta semanal debe estar entre 1 y 7.");
        }
        User user = userRepository.findById(securityHelper.getCurrentUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        boolean conditioning = "conditioning".equalsIgnoreCase(type);
        Integer current = conditioning ? user.getConditioningWeeklyGoal() : user.getTrainingWeeklyGoal();
        if (current != null && !trainingService.isFirstDayOfWeek(clientToday)) {
            throw new IllegalArgumentException("Tu meta semanal solo se puede cambiar los lunes, al comenzar la semana.");
        }
        if (conditioning) user.setConditioningWeeklyGoal(goal);
        else user.setTrainingWeeklyGoal(goal);
        userRepository.save(user);
        Map<String, Integer> out = new HashMap<>();
        out.put("martial", user.getTrainingWeeklyGoal());
        out.put("conditioning", user.getConditioningWeeklyGoal());
        return out;
    }

    // --- Weight history -------------------------------------------------------

    public List<WeightEntryDto> getWeightEntries(Long studentId) {
        requireOwnedStudent(studentId);
        return weightEntryRepository.findByStudentIdOrderByDateAsc(studentId)
                .stream().map(this::toWeightDto).toList();
    }

    @Transactional
    public WeightEntryDto saveWeightEntry(Long studentId, WeightEntryDto dto) {
        Student student = requireOwnedStudent(studentId);
        if (dto.getDate() == null || dto.getWeightKg() == null
                || dto.getWeightKg() < 20 || dto.getWeightKg() > 300) {
            throw new IllegalArgumentException("Datos de peso inválidos.");
        }
        WeightEntry entry = weightEntryRepository.findByStudentIdAndDate(studentId, dto.getDate())
                .orElseGet(() -> { WeightEntry e = new WeightEntry(); e.setStudent(student); e.setDate(dto.getDate()); return e; });
        entry.setWeightKg(dto.getWeightKg());
        return toWeightDto(weightEntryRepository.save(entry));
    }

    @Transactional
    public void deleteWeightEntry(Long studentId, java.time.LocalDate date) {
        requireOwnedStudent(studentId);
        weightEntryRepository.deleteByStudentIdAndDate(studentId, date);
    }

    private WeightEntryDto toWeightDto(WeightEntry e) {
        WeightEntryDto dto = new WeightEntryDto();
        dto.setDate(e.getDate());
        dto.setWeightKg(e.getWeightKg());
        return dto;
    }
}
