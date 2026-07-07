package com.jjplatform.api.controller;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.ClassmateDto;
import com.jjplatform.api.dto.ConditioningSessionDto;
import com.jjplatform.api.dto.CompetitionResultDto;
import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.dto.LeaderboardEntryDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentCardDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.dto.TechniqueCurriculumDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.UpcomingClassDto;
import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.service.PortalService;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Self-service portal for the STUDENT role. A student can only read their own record(s) and edit their
 * own profile photo; access is restricted to STUDENT in SecurityConfig and every record is resolved from
 * the logged-in user / verified against it, never trusted from a client-supplied id alone.
 */
@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class PortalController {

    private final StudentService studentService;
    private final PortalService portalService;
    private final SecurityHelper securityHelper;

    /** Returns the logged-in student's profile(s) — one per academy they belong to. */
    @GetMapping("/me")
    public ResponseEntity<List<StudentDto>> me() {
        Long userId = securityHelper.getCurrentUser().getId();
        return ResponseEntity.ok(studentService.getMyStudents(userId));
    }

    @GetMapping("/students/{studentId}/disciplines")
    public ResponseEntity<List<StudentDisciplineDto>> disciplines(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getDisciplines(studentId));
    }

    @GetMapping("/students/{studentId}/belt-promotions")
    public ResponseEntity<List<BeltPromotionDto>> beltPromotions(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getBeltPromotions(studentId));
    }

    /** The student adds a competition result (torneo) to one of their own disciplines. */
    @PostMapping("/students/{studentId}/disciplines/{studentDisciplineId}/results")
    public ResponseEntity<CompetitionResultDto> addCompetitionResult(@PathVariable Long studentId,
                                                                     @PathVariable Long studentDisciplineId,
                                                                     @RequestBody CompetitionResultDto dto) {
        return ResponseEntity.status(201).body(
                portalService.addCompetitionResult(studentId, studentDisciplineId, dto));
    }

    /** The student edits one of their own competition results. */
    @PutMapping("/students/{studentId}/results/{resultId}")
    public ResponseEntity<CompetitionResultDto> updateCompetitionResult(@PathVariable Long studentId,
                                                                        @PathVariable Long resultId,
                                                                        @RequestBody CompetitionResultDto dto) {
        return ResponseEntity.ok(portalService.updateCompetitionResult(studentId, resultId, dto));
    }

    @GetMapping("/students/{studentId}/payments")
    public ResponseEntity<List<PaymentDto>> payments(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getPayments(studentId));
    }

    /** The student's technique curriculum (program per belt, with learned flags). */
    @GetMapping("/students/{studentId}/techniques")
    public ResponseEntity<List<TechniqueCurriculumDto>> techniques(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getTechniqueCurriculum(studentId));
    }

    /** Marks (true) or unmarks (false) a curriculum technique learned for the student. */
    @PutMapping("/students/{studentId}/techniques/{techniqueId}")
    public ResponseEntity<Void> setTechniqueLearned(@PathVariable Long studentId,
                                                    @PathVariable Long techniqueId,
                                                    @RequestBody Map<String, Boolean> body) {
        portalService.setTechniqueLearned(studentId, techniqueId, Boolean.TRUE.equals(body.get("learned")));
        return ResponseEntity.noContent().build();
    }

    /** Online-payment methods the academy offers + bank-transfer details. */
    @GetMapping("/students/{studentId}/payment-options")
    public ResponseEntity<Map<String, Object>> paymentOptions(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getPaymentOptions(studentId));
    }

    /** Starts a Khipu/Mercado Pago checkout for a month; returns {url} to open. */
    @PostMapping("/students/{studentId}/pay")
    public ResponseEntity<Map<String, String>> pay(@PathVariable Long studentId,
                                                   @RequestBody Map<String, Object> body) {
        String method = String.valueOf(body.get("method"));
        int month = ((Number) body.get("month")).intValue();
        int year = ((Number) body.get("year")).intValue();
        String url = portalService.createCheckout(studentId, method, month, year);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // --- Class reservations ------------------------------------------------

    /** Upcoming classes (next 7 days) with capacity + the student's reservation state. */
    @GetMapping("/students/{studentId}/classes")
    public ResponseEntity<List<UpcomingClassDto>> upcomingClasses(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getUpcomingClasses(studentId));
    }

    @PostMapping("/students/{studentId}/classes/{scheduleId}/reserve")
    public ResponseEntity<Void> reserveClass(@PathVariable Long studentId, @PathVariable Long scheduleId,
                                             @RequestBody Map<String, String> body) {
        portalService.reserveClass(studentId, scheduleId, LocalDate.parse(body.get("date")));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/students/{studentId}/classes/{scheduleId}/reserve")
    public ResponseEntity<Void> cancelClass(@PathVariable Long studentId, @PathVariable Long scheduleId,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        portalService.cancelClass(studentId, scheduleId, date);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/students/{studentId}/photo")
    public ResponseEntity<Map<String, String>> updatePhoto(@PathVariable Long studentId,
                                                            @RequestParam("file") MultipartFile file) throws IOException {
        String url = portalService.updatePhoto(studentId, file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /** Portal cover/banner preference (per logged-in student). */
    @GetMapping("/banner")
    public ResponseEntity<Map<String, String>> getBanner() {
        Map<String, String> body = new HashMap<>();
        body.put("banner", portalService.getBanner());
        return ResponseEntity.ok(body);
    }

    @PutMapping("/banner")
    public ResponseEntity<Map<String, String>> setBanner(@RequestBody Map<String, String> request) {
        Map<String, String> body = new HashMap<>();
        body.put("banner", portalService.setBanner(request.get("banner")));
        return ResponseEntity.ok(body);
    }

    // --- Personal training journal ----------------------------------------

    @GetMapping("/students/{studentId}/training")
    public ResponseEntity<List<TrainingSessionDto>> trainingSessions(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getTrainingSessions(studentId));
    }

    @PostMapping("/students/{studentId}/training")
    public ResponseEntity<TrainingSessionDto> createTraining(@PathVariable Long studentId,
                                                             @RequestBody TrainingSessionDto dto) {
        return ResponseEntity.ok(portalService.createTrainingSession(studentId, dto));
    }

    @DeleteMapping("/students/{studentId}/training/{sessionId}")
    public ResponseEntity<Void> deleteTraining(@PathVariable Long studentId, @PathVariable Long sessionId) {
        portalService.deleteTrainingSession(studentId, sessionId);
        return ResponseEntity.noContent().build();
    }

    /** Kickboxing log — a striking TrainingSession against the academy's "Kickboxing" discipline. */
    @PostMapping("/students/{studentId}/kickboxing")
    public ResponseEntity<TrainingSessionDto> createKickboxing(@PathVariable Long studentId,
                                                               @RequestBody TrainingSessionDto dto) {
        return ResponseEntity.ok(portalService.createKickboxingSession(studentId, dto));
    }

    // --- Conditioning (strength & physical prep) journal ------------------

    @GetMapping("/students/{studentId}/conditioning")
    public ResponseEntity<List<ConditioningSessionDto>> conditioningSessions(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getConditioningSessions(studentId));
    }

    @PostMapping("/students/{studentId}/conditioning")
    public ResponseEntity<ConditioningSessionDto> createConditioning(@PathVariable Long studentId,
                                                                     @RequestBody ConditioningSessionDto dto) {
        return ResponseEntity.ok(portalService.createConditioningSession(studentId, dto));
    }

    @DeleteMapping("/students/{studentId}/conditioning/{sessionId}")
    public ResponseEntity<Void> deleteConditioning(@PathVariable Long studentId, @PathVariable Long sessionId) {
        portalService.deleteConditioningSession(studentId, sessionId);
        return ResponseEntity.noContent().build();
    }

    /** {@code today} is the device's local date so streak day boundaries follow the student, not the server TZ. */
    @GetMapping("/students/{studentId}/training/summary")
    public ResponseEntity<TrainingSummaryDto> trainingSummary(@PathVariable Long studentId,
                                                              @RequestParam(required = false)
                                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getTrainingSummary(studentId, today));
    }

    /**
     * LEGACY (array, 🥋 arte marcial): kept for pre-1.6.3 apps that expect a plain list — returning the new
     * object shape here crashed them (white screen). New clients use /training/leaderboards.
     */
    @GetMapping("/students/{studentId}/training/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDto>> trainingLeaderboard(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getTrainingLeaderboard(studentId, today));
    }

    /** Academy leaderboards (🥋 arte marcial + 🏋️ físico) for tabbed ranking. Used by 1.6.3+ clients. */
    @GetMapping("/students/{studentId}/training/leaderboards")
    public ResponseEntity<com.jjplatform.api.dto.LeaderboardsDto> trainingLeaderboards(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getTrainingLeaderboards(studentId, today));
    }

    /** Premium-only: "you vs academy" snapshot (requires active Pro). */
    @GetMapping("/students/{studentId}/training/insights-pro")
    public ResponseEntity<com.jjplatform.api.dto.ProInsightsDto> proInsights(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getProInsights(studentId, today));
    }

    /** Pro-only: last AI-coach analysis (cached; no generation). */
    @GetMapping("/students/{studentId}/training/coach")
    public ResponseEntity<com.jjplatform.api.dto.CoachInsightDto> coachInsight(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getCoachInsight(studentId));
    }

    /** Pro-only: generate (or return today's cached) AI-coach analysis — at most one AI call per day. */
    @PostMapping("/students/{studentId}/training/coach")
    public ResponseEntity<com.jjplatform.api.dto.CoachInsightDto> generateCoachInsight(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.generateCoachInsight(studentId, today));
    }

    /** Classmates for the training-partner picker. */
    @GetMapping("/students/{studentId}/classmates")
    public ResponseEntity<List<ClassmateDto>> classmates(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getClassmates(studentId));
    }

    /** Card of an academy mate (tapped from a ranking): name, rut, belt, age, photo. */
    @GetMapping("/students/{studentId}/students/{targetId}/card")
    public ResponseEntity<StudentCardDto> studentCard(@PathVariable Long studentId, @PathVariable Long targetId) {
        return ResponseEntity.ok(portalService.getStudentCard(studentId, targetId));
    }

    /** The student updates their own weight (kg). Body: {"weight": 72.5} (null clears it). */
    @PutMapping("/students/{studentId}/weight")
    public ResponseEntity<Map<String, Double>> updateWeight(@PathVariable Long studentId,
                                                            @RequestBody Map<String, Double> body) {
        Double saved = portalService.updateWeight(studentId, body.get("weight"));
        Map<String, Double> out = new HashMap<>();
        out.put("weight", saved);
        return ResponseEntity.ok(out);
    }

    // --- Weight history -------------------------------------------------------

    @GetMapping("/students/{studentId}/weight-entries")
    public ResponseEntity<List<com.jjplatform.api.dto.WeightEntryDto>> getWeightEntries(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getWeightEntries(studentId));
    }

    @PostMapping("/students/{studentId}/weight-entries")
    public ResponseEntity<com.jjplatform.api.dto.WeightEntryDto> saveWeightEntry(
            @PathVariable Long studentId,
            @RequestBody com.jjplatform.api.dto.WeightEntryDto dto) {
        return ResponseEntity.ok(portalService.saveWeightEntry(studentId, dto));
    }

    @DeleteMapping("/students/{studentId}/weight-entries/{date}")
    public ResponseEntity<Void> deleteWeightEntry(
            @PathVariable Long studentId,
            @PathVariable @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        portalService.deleteWeightEntry(studentId, date);
        return ResponseEntity.noContent().build();
    }

    /** Birthdays of the academy for the current month. */
    @GetMapping("/students/{studentId}/birthdays")
    public ResponseEntity<List<com.jjplatform.api.dto.BirthdayDto>> birthdays(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getBirthdaysThisMonth(studentId));
    }

    // --- Duels (challenges) -----------------------------------------------

    @GetMapping("/students/{studentId}/duels")
    public ResponseEntity<List<DuelDto>> duels(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getDuels(studentId));
    }

    @GetMapping("/students/{studentId}/duels/feed")
    public ResponseEntity<List<DuelDto>> duelFeed(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getDuelFeed(studentId));
    }

    /** Paginated academy feed by tab ("results" | "unresolved"), keyset cursor, newest first. */
    @GetMapping("/students/{studentId}/duels/feed/page")
    public ResponseEntity<com.jjplatform.api.dto.DuelFeedPageDto> duelFeedPage(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "results") String tab,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(portalService.getDuelFeedPage(studentId, tab, cursor, size));
    }

    /** Top-10 academy duel ranking by win/loss record. */
    @GetMapping("/students/{studentId}/duels/ranking")
    public ResponseEntity<List<com.jjplatform.api.dto.DuelRankingDto>> duelRanking(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getDuelRanking(studentId));
    }

    @PostMapping("/students/{studentId}/duels")
    public ResponseEntity<DuelDto> createDuel(@PathVariable Long studentId, @RequestBody CreateDuelRequest req) {
        return ResponseEntity.ok(portalService.createDuel(studentId, req));
    }

    @PostMapping("/students/{studentId}/duels/{duelId}/respond")
    public ResponseEntity<DuelDto> respondDuel(@PathVariable Long studentId, @PathVariable Long duelId,
                                               @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(portalService.respondDuel(studentId, duelId, Boolean.TRUE.equals(body.get("accept"))));
    }

    @PostMapping("/students/{studentId}/duels/{duelId}/result")
    public ResponseEntity<DuelDto> reportDuelResult(@PathVariable Long studentId, @PathVariable Long duelId,
                                                    @RequestBody DuelResultRequest req) {
        return ResponseEntity.ok(portalService.reportDuelResult(studentId, duelId, req));
    }

    /** A participant closes an accepted bout that won't be fought. Body: {"reason":"SCARED"|"POSTPONED"}. */
    @PostMapping("/students/{studentId}/duels/{duelId}/close")
    public ResponseEntity<DuelDto> closeDuel(@PathVariable Long studentId, @PathVariable Long duelId,
                                             @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(portalService.closeDuel(studentId, duelId, body.get("reason")));
    }

    /** Register this device's FCM token so it can receive academy push notifications. */
    @PostMapping("/students/{studentId}/devices")
    public ResponseEntity<Void> registerDevice(@PathVariable Long studentId, @RequestBody Map<String, String> body) {
        portalService.registerDevice(studentId, body.get("token"), body.get("platform"));
        return ResponseEntity.ok().build();
    }

    /** Drop this device's token (e.g. on logout). */
    @DeleteMapping("/students/{studentId}/devices")
    public ResponseEntity<Void> unregisterDevice(@PathVariable Long studentId, @RequestParam String token) {
        portalService.unregisterDevice(studentId, token);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/students/{studentId}/duels/{duelId}")
    public ResponseEntity<Void> cancelDuel(@PathVariable Long studentId, @PathVariable Long duelId) {
        portalService.cancelDuel(studentId, duelId);
        return ResponseEntity.noContent().build();
    }

    /** Weekly goals {martial, conditioning} for the logged-in student. */
    @GetMapping("/training/goals")
    public ResponseEntity<Map<String, Integer>> getTrainingGoals() {
        return ResponseEntity.ok(portalService.getTrainingGoals());
    }

    /**
     * Sets one weekly goal. Body: { "type": "martial"|"conditioning", "goal": 1-7 or null, "today": ISO date }.
     * An already-set goal can only change on Monday (server-enforced); returns both goals.
     */
    @PutMapping("/training/goals")
    public ResponseEntity<Map<String, Integer>> setTrainingGoal(@RequestBody Map<String, Object> request) {
        String type = String.valueOf(request.get("type"));
        Object g = request.get("goal");
        Integer goal = g == null ? null : ((Number) g).intValue();
        Object t = request.get("today");
        LocalDate today = t == null ? null : LocalDate.parse(String.valueOf(t));
        return ResponseEntity.ok(portalService.setTrainingGoal(type, goal, today));
    }

    /*
     * Backward-compat: apps anteriores a la separación martial/conditioning (commit f54dcde) llaman al
     * singular /training/goal con shape {goal}. Sin este alias, Spring cae al handler de estáticos y devuelve
     * 404 (NoResourceFoundException) al arrancar. Lo mapeamos a la meta "martial" (la única que existía entonces).
     */
    @GetMapping("/training/goal")
    public ResponseEntity<Map<String, Integer>> getTrainingGoalLegacy() {
        Map<String, Integer> body = new HashMap<>();
        body.put("goal", portalService.getTrainingGoals().get("martial"));
        return ResponseEntity.ok(body);
    }

    @PutMapping("/training/goal")
    public ResponseEntity<Map<String, Integer>> setTrainingGoalLegacy(@RequestBody Map<String, Object> request) {
        Object g = request.get("goal");
        Integer goal = g == null ? null : ((Number) g).intValue();
        // Sin "today": la regla de "solo lunes" se evalúa contra el reloj del server (el primer set se permite igual).
        Map<String, Integer> result = portalService.setTrainingGoal("martial", goal, null);
        Map<String, Integer> body = new HashMap<>();
        body.put("goal", result.get("martial"));
        return ResponseEntity.ok(body);
    }
}
