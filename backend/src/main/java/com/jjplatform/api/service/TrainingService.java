package com.jjplatform.api.service;

import com.jjplatform.api.dto.LeaderboardEntryDto;
import com.jjplatform.api.dto.LeaderboardsDto;
import com.jjplatform.api.dto.TrainingPartnerDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.TrainingSubmissionDto;
import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.ConditioningSession;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.TrainingPartner;
import com.jjplatform.api.model.TrainingSession;
import com.jjplatform.api.model.TrainingSubmission;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Backs the student's personal training journal (self-logged sessions) and the
 * streak / weekly-goal engagement loop. Ownership of the student is enforced by
 * the caller (PortalService); this service only validates the session belongs to
 * the resolved student where relevant.
 */
@Service
@RequiredArgsConstructor
public class TrainingService {

    private final TrainingSessionRepository sessionRepository;
    private final ConditioningService conditioningService;
    private final DisciplineRepository disciplineRepository;

    @Transactional
    public TrainingSessionDto create(Student student, TrainingSessionDto dto) {
        TrainingSession s = new TrainingSession();
        s.setStudent(student);
        // The device sends its own local calendar date and whether it's a late entry; we trust both.
        // Railway runs in another timezone (Europe/UTC), so any server-clock comparison here would
        // shift Chile's evening sessions into the next day. Fall back to the server date only if none
        // was sent.
        s.setDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        s.setBackdated(Boolean.TRUE.equals(dto.getBackdated()));
        s.setModality(parseModality(dto.getModality()));
        s.setDurationMin(clampPositive(dto.getDurationMin()));
        s.setRoundsCount(clampPositive(dto.getRoundsCount()));
        s.setEnergy(clampRating(dto.getEnergy()));
        s.setPerformance(clampRating(dto.getPerformance()));
        s.setNotes(trimNotes(dto.getNotes()));

        if (dto.getDisciplineId() != null) {
            Discipline d = disciplineRepository.findById(dto.getDisciplineId())
                    .orElseThrow(() -> new ResourceNotFoundException("Disciplina no encontrada"));
            // Only allow linking a discipline from the student's own academy.
            if (!d.getAcademy().getId().equals(student.getAcademy().getId())) {
                throw new ResourceNotFoundException("Disciplina no encontrada");
            }
            s.setDiscipline(d);
        }

        if (dto.getTechniques() != null) {
            for (String t : dto.getTechniques()) {
                if (t != null && !t.isBlank()) s.getTechniques().add(t.trim());
            }
        }
        if (dto.getSubmissions() != null) {
            for (TrainingSubmissionDto sub : dto.getSubmissions()) {
                if (sub == null || sub.getName() == null || sub.getName().isBlank()) continue;
                TrainingSubmission.Direction dir = parseDirection(sub.getDirection());
                s.getSubmissions().add(new TrainingSubmission(sub.getName().trim(), dir));
            }
        }
        if (dto.getPartners() != null) {
            for (TrainingPartnerDto p : dto.getPartners()) {
                if (p == null || p.getName() == null || p.getName().isBlank()) continue;
                String belt = (p.getBelt() == null || p.getBelt().isBlank()) ? null : p.getBelt().trim();
                s.getPartners().add(new TrainingPartner(p.getName().trim(), belt, p.getPartnerStudentId()));
            }
        }

        return toDto(sessionRepository.save(s));
    }

    public List<TrainingSessionDto> listByStudent(Long studentId) {
        return sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public void delete(Long studentId, Long sessionId) {
        TrainingSession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sesión no encontrada"));
        if (!s.getStudent().getId().equals(studentId)) {
            throw new ResourceNotFoundException("Sesión no encontrada");
        }
        sessionRepository.delete(s);
    }

    /** Default weekly goals when the student hasn't set one yet (used for the streak math). */
    private static final int DEFAULT_MARTIAL_GOAL = 4;
    private static final int DEFAULT_CONDITIONING_GOAL = 2;

    public TrainingSummaryDto summary(Long studentId, Integer martialGoal, Integer conditioningGoal, LocalDate clientToday) {
        LocalDate today = effectiveToday(clientToday);
        List<TrainingSession> all = sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId);

        // Trained-day sets per type (backdated/late entries count for history but NOT for the streak).
        Set<LocalDate> martialDays = new HashSet<>();
        Set<LocalDate> condDays = new HashSet<>();
        int monthSessions = 0, monthMinutes = 0, monthRounds = 0;
        for (TrainingSession s : all) {
            if (!s.isBackdated()) martialDays.add(s.getDate());
            if (s.getDate().getYear() == today.getYear() && s.getDate().getMonthValue() == today.getMonthValue()) {
                monthSessions++;
                if (s.getDurationMin() != null) monthMinutes += s.getDurationMin();
                if (s.getRoundsCount() != null) monthRounds += s.getRoundsCount();
            }
        }
        for (ConditioningSession c : conditioningService.listSessions(studentId)) {
            if (!c.isBackdated()) condDays.add(c.getDate());
        }

        StreakStats martial = weeklyStreak(martialDays, today, martialGoal != null ? martialGoal : DEFAULT_MARTIAL_GOAL);
        StreakStats cond = weeklyStreak(condDays, today, conditioningGoal != null ? conditioningGoal : DEFAULT_CONDITIONING_GOAL);

        TrainingSummaryDto out = new TrainingSummaryDto();
        // Martial (legacy field names)
        out.setWeeklyGoal(martialGoal); // null → onboarding on the client
        out.setThisWeekCount(martial.thisWeek());
        out.setCurrentStreak(martial.current());
        out.setMaxStreak(martial.max());
        out.setWeeklyGoalMet(martialGoal != null && martial.goalMet());
        // Físico
        out.setConditioningGoal(conditioningGoal);
        out.setConditioningThisWeek(cond.thisWeek());
        out.setConditioningStreak(cond.current());
        out.setConditioningMax(cond.max());
        out.setConditioningGoalMet(conditioningGoal != null && cond.goalMet());
        // Comodín (1 semana perdonada por mes; se muestra "usado" si cualquiera de las dos rachas lo gastó)
        boolean comodinUsed = martial.comodinUsedThisMonth() || cond.comodinUsedThisMonth();
        out.setComodinUsed(comodinUsed);
        out.setComodinLeft(comodinUsed ? 0 : 1);
        // Volumen del mes
        out.setMonthSessions(monthSessions);
        out.setMonthMinutes(monthMinutes);
        out.setMonthRounds(monthRounds);
        return out;
    }

    /** Snapshot of one type's weekly-goal streak. Package-private for {@code TrainingServiceStreakTest}. */
    record StreakStats(int current, int max, int thisWeek, boolean goalMet, boolean comodinUsedThisMonth) {}

    /**
     * Weekly-goal streak: accumulated trained days that grow while you meet your weekly goal, and reset
     * to 0 when a completed week misses it — EXCEPT one missed week per calendar month is forgiven
     * (comodín). The current (in-progress) week is always additive and never breaks the streak.
     */
    StreakStats weeklyStreak(Set<LocalDate> days, LocalDate today, int goal) {
        if (goal < 1) goal = 1;
        if (days.isEmpty()) return new StreakStats(0, 0, 0, false, false);

        Map<LocalDate, Integer> perWeek = new HashMap<>(); // Monday of week → trained days that week
        LocalDate earliest = today;
        for (LocalDate d : days) {
            perWeek.merge(mondayOf(d), 1, Integer::sum);
            if (d.isBefore(earliest)) earliest = d;
        }
        LocalDate currentMonday = mondayOf(today);

        int running = 0, max = 0;
        Set<YearMonth> comodinesUsados = new HashSet<>(); // calendar months that already spent their comodín
        for (LocalDate wk = mondayOf(earliest); wk.isBefore(currentMonday); wk = wk.plusWeeks(1)) {
            int d = perWeek.getOrDefault(wk, 0);
            if (d >= goal) {
                running += d;
            } else {
                YearMonth ym = YearMonth.from(wk);
                if (comodinesUsados.add(ym)) running += d; // forgiven this month (days still count, no reset)
                else running = 0;                           // month's comodín already spent → break
            }
            max = Math.max(max, running);
        }

        int thisWeek = perWeek.getOrDefault(currentMonday, 0);
        int current = running + thisWeek; // in-progress week is additive, never breaks
        max = Math.max(max, current);
        boolean comodinUsedThisMonth = comodinesUsados.contains(YearMonth.from(currentMonday));
        return new StreakStats(current, max, thisWeek, thisWeek >= goal, comodinUsedThisMonth);
    }

    /** Monday (ISO) of the week containing {@code d}. */
    private LocalDate mondayOf(LocalDate d) {
        return d.minusDays(d.getDayOfWeek().getValue() - 1);
    }

    /**
     * Academy training leaderboard (🥋 arte marcial): active students ranked by martial-art training days
     * this week, with the weekly-goal streak (default martial goal) as tiebreaker.
     */
    @Transactional(readOnly = true)
    public List<LeaderboardEntryDto> leaderboard(Long academyId, LocalDate clientToday) {
        LocalDate today = effectiveToday(clientToday);
        LocalDate from = today.minusDays(366);
        String currentWeek = weekKey(today);

        Map<Long, Student> studentsById = new HashMap<>();
        Map<Long, Set<LocalDate>> daysByStudent = new HashMap<>();
        Map<Long, Integer> weekCountByStudent = new HashMap<>();

        for (TrainingSession s : sessionRepository.findByStudentAcademyIdAndDateGreaterThanEqual(academyId, from)) {
            Student student = s.getStudent();
            if (!Boolean.TRUE.equals(student.getActive())) continue;
            if (s.isBackdated()) continue; // late entries don't extend the streak
            studentsById.putIfAbsent(student.getId(), student);
            daysByStudent.computeIfAbsent(student.getId(), k -> new HashSet<>()).add(s.getDate());
            if (weekKey(s.getDate()).equals(currentWeek)) {
                weekCountByStudent.merge(student.getId(), 1, Integer::sum);
            }
        }
        return buildBoard(studentsById, daysByStudent, weekCountByStudent, DEFAULT_MARTIAL_GOAL, today);
    }

    /**
     * Academy conditioning leaderboard (🏋️ físico): active students ranked by gym sessions this week,
     * with the físico weekly-goal streak (default conditioning goal) as tiebreaker.
     */
    @Transactional(readOnly = true)
    public List<LeaderboardEntryDto> conditioningLeaderboard(Long academyId, LocalDate clientToday) {
        LocalDate today = effectiveToday(clientToday);
        LocalDate from = today.minusDays(366);
        String currentWeek = weekKey(today);

        Map<Long, Student> studentsById = new HashMap<>();
        Map<Long, Set<LocalDate>> daysByStudent = new HashMap<>();
        Map<Long, Integer> weekCountByStudent = new HashMap<>();

        for (ConditioningSession s : conditioningService.academySessions(academyId, from)) {
            Student student = s.getStudent();
            if (!Boolean.TRUE.equals(student.getActive())) continue;
            studentsById.putIfAbsent(student.getId(), student);
            daysByStudent.computeIfAbsent(student.getId(), k -> new HashSet<>()).add(s.getDate());
            if (weekKey(s.getDate()).equals(currentWeek)) {
                weekCountByStudent.merge(student.getId(), 1, Integer::sum);
            }
        }
        return buildBoard(studentsById, daysByStudent, weekCountByStudent, DEFAULT_CONDITIONING_GOAL, today);
    }

    /** Both academy leaderboards (🥋 arte marcial + 🏋️ físico) in one payload for the tabbed ranking. */
    @Transactional(readOnly = true)
    public LeaderboardsDto leaderboards(Long academyId, LocalDate clientToday) {
        LeaderboardsDto out = new LeaderboardsDto();
        out.setMartial(leaderboard(academyId, clientToday));
        out.setConditioning(conditioningLeaderboard(academyId, clientToday));
        return out;
    }

    /** Rank students by days trained this week (desc), then weekly-goal streak (desc), then name. */
    private List<LeaderboardEntryDto> buildBoard(
            Map<Long, Student> studentsById,
            Map<Long, Set<LocalDate>> daysByStudent,
            Map<Long, Integer> weekCountByStudent,
            int goal, LocalDate today) {
        return studentsById.values().stream()
                .map(student -> {
                    LeaderboardEntryDto e = new LeaderboardEntryDto();
                    e.setStudentId(student.getId());
                    e.setName(student.getName());
                    e.setPhotoUrl(student.getPhotoUrl());
                    e.setThisWeekCount(weekCountByStudent.getOrDefault(student.getId(), 0));
                    e.setCurrentStreak(weeklyStreak(daysByStudent.get(student.getId()), today, goal).current());
                    return e;
                })
                .sorted(Comparator.comparingInt(LeaderboardEntryDto::getThisWeekCount).reversed()
                        .thenComparing(Comparator.comparingInt(LeaderboardEntryDto::getCurrentStreak).reversed())
                        .thenComparing(LeaderboardEntryDto::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /**
     * Premium "you vs academy" snapshot: reuses the leaderboard aggregation to place the student against
     * the academy average and compute their rank/percentile. Premium gating happens in PortalService.
     */
    @Transactional(readOnly = true)
    public com.jjplatform.api.dto.ProInsightsDto proInsights(Long academyId, Long studentId, LocalDate clientToday) {
        List<LeaderboardEntryDto> board = leaderboard(academyId, clientToday);
        com.jjplatform.api.dto.ProInsightsDto out = new com.jjplatform.api.dto.ProInsightsDto();
        int total = board.size();
        out.setTotalStudents(total);
        if (total == 0) return out;

        double avgWeek = board.stream().mapToInt(LeaderboardEntryDto::getThisWeekCount).average().orElse(0);
        double avgStreak = board.stream().mapToInt(LeaderboardEntryDto::getCurrentStreak).average().orElse(0);
        out.setAcademyAvgThisWeek(Math.round(avgWeek * 10) / 10.0);
        out.setAcademyAvgStreak(Math.round(avgStreak * 10) / 10.0);

        for (int i = 0; i < total; i++) {
            LeaderboardEntryDto e = board.get(i);
            if (e.getStudentId().equals(studentId)) {
                out.setYourThisWeek(e.getThisWeekCount());
                out.setYourStreak(e.getCurrentStreak());
                out.setRank(i + 1);
                // Percentile = share of peers you're at or above (by weekly sessions).
                long atOrBelow = board.stream().filter(o -> o.getThisWeekCount() <= e.getThisWeekCount()).count();
                out.setPercentile(total == 1 ? 100 : (int) Math.round((atOrBelow - 1) * 100.0 / (total - 1)));
                break;
            }
        }
        return out;
    }


    /**
     * The student's local "today" (sent by the device) wins over the server clock — Railway
     * runs in UTC, which would otherwise shift evening sessions into the next day. Sanity
     * clamp: anything more than a day away from server time falls back to the server date.
     */
    private LocalDate effectiveToday(LocalDate clientToday) {
        LocalDate server = LocalDate.now();
        if (clientToday == null || Math.abs(ChronoUnit.DAYS.between(server, clientToday)) > 1) {
            return server;
        }
        return clientToday;
    }

    /**
     * True when the effective "today" is Monday — the only day a student may change an already-set weekly
     * goal, so nobody lowers it mid-week to dodge a goal they're about to miss. Uses the same client-date
     * clamp as the streak math for consistency.
     */
    public boolean isFirstDayOfWeek(LocalDate clientToday) {
        return effectiveToday(clientToday).getDayOfWeek() == java.time.DayOfWeek.MONDAY;
    }

    private String weekKey(LocalDate d) {
        int week = d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int year = d.get(IsoFields.WEEK_BASED_YEAR);
        return year + "-W" + (week < 10 ? "0" + week : week);
    }

    // --- mapping / validation ---------------------------------------------

    private TrainingSessionDto toDto(TrainingSession s) {
        TrainingSessionDto dto = new TrainingSessionDto();
        dto.setId(s.getId());
        if (s.getDiscipline() != null) {
            dto.setDisciplineId(s.getDiscipline().getId());
            dto.setDisciplineName(s.getDiscipline().getName());
        }
        dto.setDate(s.getDate());
        dto.setBackdated(s.isBackdated());
        dto.setModality(s.getModality() != null ? s.getModality().name() : null);
        dto.setDurationMin(s.getDurationMin());
        dto.setRoundsCount(s.getRoundsCount());
        dto.setEnergy(s.getEnergy());
        dto.setPerformance(s.getPerformance());
        dto.setNotes(s.getNotes());
        dto.setTechniques(new ArrayList<>(s.getTechniques()));
        List<TrainingSubmissionDto> subs = new ArrayList<>();
        for (TrainingSubmission sub : s.getSubmissions()) {
            TrainingSubmissionDto sd = new TrainingSubmissionDto();
            sd.setName(sub.getName());
            sd.setDirection(sub.getDirection().name());
            subs.add(sd);
        }
        dto.setSubmissions(subs);
        List<TrainingPartnerDto> partners = new ArrayList<>();
        for (TrainingPartner p : s.getPartners()) {
            TrainingPartnerDto pd = new TrainingPartnerDto();
            pd.setName(p.getName());
            pd.setBelt(p.getBelt());
            pd.setPartnerStudentId(p.getPartnerStudentId());
            partners.add(pd);
        }
        dto.setPartners(partners);
        dto.setCreatedAt(s.getCreatedAt());
        return dto;
    }

    private TrainingSession.Modality parseModality(String v) {
        if (v == null || v.isBlank()) return null;
        try {
            return TrainingSession.Modality.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Modalidad no válida (GI/NOGI/OPEN_MAT/COMPETITION).");
        }
    }

    private TrainingSubmission.Direction parseDirection(String v) {
        if (v == null || v.isBlank()) return TrainingSubmission.Direction.LOGRADA;
        try {
            return TrainingSubmission.Direction.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Dirección de sumisión no válida (LOGRADA/RECIBIDA).");
        }
    }

    private Integer clampRating(Integer v) {
        if (v == null) return null;
        if (v < 1) return 1;
        if (v > 5) return 5;
        return v;
    }

    private Integer clampPositive(Integer v) {
        if (v == null) return null;
        return v < 0 ? 0 : v;
    }

    private String trimNotes(String notes) {
        if (notes == null) return null;
        String t = notes.trim();
        if (t.isEmpty()) return null;
        return t.length() > 500 ? t.substring(0, 500) : t;
    }

}
