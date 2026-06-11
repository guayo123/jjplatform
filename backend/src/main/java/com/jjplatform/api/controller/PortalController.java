package com.jjplatform.api.controller;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.ClassmateDto;
import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.dto.LeaderboardEntryDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.dto.TrainingSessionDto;
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

    @GetMapping("/students/{studentId}/payments")
    public ResponseEntity<List<PaymentDto>> payments(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getPayments(studentId));
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

    /** {@code today} is the device's local date so streak day boundaries follow the student, not the server TZ. */
    @GetMapping("/students/{studentId}/training/summary")
    public ResponseEntity<TrainingSummaryDto> trainingSummary(@PathVariable Long studentId,
                                                              @RequestParam(required = false)
                                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getTrainingSummary(studentId, today));
    }

    /** Spends a monthly streak repair to fill the current 1-day gap and revive the broken streak. */
    @PostMapping("/students/{studentId}/training/streak-repair")
    public ResponseEntity<TrainingSummaryDto> repairStreak(@PathVariable Long studentId,
                                                           @RequestParam(required = false)
                                                           @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.repairStreak(studentId, today));
    }

    /** Academy training leaderboard: sessions this week + day streak per active student. */
    @GetMapping("/students/{studentId}/training/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDto>> trainingLeaderboard(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
        return ResponseEntity.ok(portalService.getTrainingLeaderboard(studentId, today));
    }

    /** Classmates for the training-partner picker. */
    @GetMapping("/students/{studentId}/classmates")
    public ResponseEntity<List<ClassmateDto>> classmates(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getClassmates(studentId));
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

    @DeleteMapping("/students/{studentId}/duels/{duelId}")
    public ResponseEntity<Void> cancelDuel(@PathVariable Long studentId, @PathVariable Long duelId) {
        portalService.cancelDuel(studentId, duelId);
        return ResponseEntity.noContent().build();
    }

    /** Weekly training goal (per logged-in student). */
    @GetMapping("/training/goal")
    public ResponseEntity<Map<String, Integer>> getTrainingGoal() {
        Map<String, Integer> body = new HashMap<>();
        body.put("goal", portalService.getTrainingGoal());
        return ResponseEntity.ok(body);
    }

    @PutMapping("/training/goal")
    public ResponseEntity<Map<String, Integer>> setTrainingGoal(@RequestBody Map<String, Integer> request) {
        Map<String, Integer> body = new HashMap<>();
        body.put("goal", portalService.setTrainingGoal(request.get("goal")));
        return ResponseEntity.ok(body);
    }
}
