package com.jjplatform.api.service;

import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.model.ConditioningSession;
import com.jjplatform.api.model.TrainingSession;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Weekly-goal streak: accumulated trained days that grow while the weekly goal is met, reset to 0 on a
 * missed completed week — with ONE forgiven "comodín" week per calendar month. The in-progress week never
 * breaks. Split by type (arte marcial vs físico).
 *
 * The core math is unit-tested directly via {@code weeklyStreak}; a few tests cover the {@code summary}
 * wiring (type split, goal defaults, backdated exclusion).
 */
@ExtendWith(MockitoExtension.class)
class TrainingServiceStreakTest {

    private static final long STUDENT_ID = 1L;
    // Late in the month so the last several ISO weeks all fall in the SAME calendar month — needed to
    // reason about the once-per-month comodín deterministically (any weekday of the 29th → weeks 0..3 in July).
    private static final LocalDate TODAY = LocalDate.of(2026, 7, 29);

    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private ConditioningService conditioningService;
    @Mock private DisciplineRepository disciplineRepository;

    private TrainingService service;

    @BeforeEach
    void setUp() {
        service = new TrainingService(sessionRepository, conditioningService, disciplineRepository);
    }

    // --- helpers -----------------------------------------------------------

    /** Monday of the week that is {@code weeksAgo} weeks before the current one. */
    private LocalDate mon(int weeksAgo) {
        LocalDate currentMonday = TODAY.minusDays(TODAY.getDayOfWeek().getValue() - 1);
        return currentMonday.minusWeeks(weeksAgo);
    }

    /** Add the first {@code n} days (Mon, Tue, …) of the week {@code weeksAgo} weeks ago to {@code into}. */
    private void addWeek(Set<LocalDate> into, int weeksAgo, int n) {
        for (int i = 0; i < n; i++) into.add(mon(weeksAgo).plusDays(i));
    }

    private TrainingSession trainingOn(LocalDate d) {
        TrainingSession s = new TrainingSession();
        s.setDate(d);
        return s;
    }

    private ConditioningSession conditioningOn(LocalDate d) {
        ConditioningSession c = new ConditioningSession();
        c.setDate(d);
        return c;
    }

    // === Core weekly-streak math (direct) ==================================

    @Test
    void emptyHistoryHasNoStreak() {
        assertThat(service.weeklyStreak(Set.of(), TODAY, 4).current()).isZero();
    }

    @Test
    void inProgressWeekBelowGoalDoesNotBreakTheStreak() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 0, 3); // 3 of a 4-day goal, week still running
        var s = service.weeklyStreak(d, TODAY, 4);
        assertThat(s.current()).isEqualTo(3);
        assertThat(s.goalMet()).isFalse();
    }

    @Test
    void metWeekPlusInProgressWeekAccumulate() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 1, 4); // last week met the goal
        addWeek(d, 0, 2); // this week, 2 so far
        var s = service.weeklyStreak(d, TODAY, 4);
        assertThat(s.current()).isEqualTo(6);
        assertThat(s.max()).isEqualTo(6);
    }

    @Test
    void restDaysWithinAMetWeekDoNotBreakIt() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 1, 4); // 4 trained + 3 rest days = goal met, streak intact
        addWeek(d, 0, 1);
        assertThat(service.weeklyStreak(d, TODAY, 4).current()).isEqualTo(5);
    }

    @Test
    void oneMissedWeekIsForgivenByTheMonthlyComodin() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 2, 4); // met
        addWeek(d, 1, 1); // missed (1 < 4) → forgiven by comodín
        var s = service.weeklyStreak(d, TODAY, 4);
        assertThat(s.current()).isEqualTo(5); // 4 + 1, streak survives
        assertThat(s.comodinUsedThisMonth()).isTrue();
    }

    @Test
    void aFullyRestedWeekIsAlsoForgiven() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 2, 4); // met
        // week 1 = 0 trained days → missed, forgiven (adds nothing, doesn't reset)
        addWeek(d, 0, 4); // this week met too
        assertThat(service.weeklyStreak(d, TODAY, 4).current()).isEqualTo(8);
    }

    @Test
    void secondMissedWeekInSameMonthResetsTheStreak() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 3, 4); // met  → running 4
        addWeek(d, 2, 1); // miss → forgiven (comodín), running 5
        addWeek(d, 1, 1); // miss → comodín spent this month → reset to 0
        var s = service.weeklyStreak(d, TODAY, 4);
        assertThat(s.current()).isZero();
        assertThat(s.max()).isEqualTo(5); // best run before the reset
    }

    @Test
    void goalOfOneCountsEveryTrainedDay() {
        Set<LocalDate> d = new HashSet<>();
        addWeek(d, 1, 1); // met (goal 1)
        addWeek(d, 0, 1);
        assertThat(service.weeklyStreak(d, TODAY, 1).current()).isEqualTo(2);
    }

    // === summary() wiring ==================================================
    //
    // summary() clamps the client date to the real server date when they differ by more than ~1 day
    // (anti-clock-tampering). So these tests anchor on LocalDate.now() and place sessions in the *current
    // real* week; the comodín/multi-week edge cases above call weeklyStreak with an explicit `today`
    // (no clamp), so they can use the fixed TODAY safely.

    /** A day of the current real week (the week summary() will treat as in-progress). */
    private LocalDate thisRealWeek(int dayOffset) {
        LocalDate today = LocalDate.now();
        return today.minusDays(today.getDayOfWeek().getValue() - 1).plusDays(dayOffset);
    }

    @Test
    void summarySplitsMartialAndConditioningStreaks() {
        List<TrainingSession> martial = new ArrayList<>();
        for (int i = 0; i < 4; i++) martial.add(trainingOn(thisRealWeek(i)));
        when(sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(anyLong())).thenReturn(martial);
        List<ConditioningSession> cond = new ArrayList<>();
        for (int i = 0; i < 2; i++) cond.add(conditioningOn(thisRealWeek(i)));
        when(conditioningService.listSessions(anyLong())).thenReturn(cond);

        TrainingSummaryDto out = service.summary(STUDENT_ID, 4, 2, LocalDate.now());
        assertThat(out.getCurrentStreak()).isEqualTo(4);
        assertThat(out.getThisWeekCount()).isEqualTo(4);
        assertThat(out.isWeeklyGoalMet()).isTrue();
        assertThat(out.getConditioningStreak()).isEqualTo(2);
        assertThat(out.getConditioningThisWeek()).isEqualTo(2);
        assertThat(out.isConditioningGoalMet()).isTrue();
    }

    @Test
    void backdatedSessionsDoNotCountTowardTheStreak() {
        TrainingSession real = trainingOn(thisRealWeek(0));
        TrainingSession late = trainingOn(thisRealWeek(1));
        late.setBackdated(true);
        when(sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(anyLong())).thenReturn(List.of(real, late));
        when(conditioningService.listSessions(anyLong())).thenReturn(List.of());

        TrainingSummaryDto out = service.summary(STUDENT_ID, 4, 2, LocalDate.now());
        assertThat(out.getThisWeekCount()).isEqualTo(1); // only the non-backdated day
    }

    @Test
    void nullGoalStillComputesStreakButIsNotMarkedMet() {
        List<TrainingSession> martial = new ArrayList<>();
        for (int i = 0; i < 4; i++) martial.add(trainingOn(thisRealWeek(i)));
        when(sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(anyLong())).thenReturn(martial);
        when(conditioningService.listSessions(anyLong())).thenReturn(List.of());

        TrainingSummaryDto out = service.summary(STUDENT_ID, null, null, LocalDate.now());
        assertThat(out.getWeeklyGoal()).isNull();          // client shows onboarding
        assertThat(out.getCurrentStreak()).isEqualTo(4);   // computed with the default goal
        assertThat(out.isWeeklyGoalMet()).isFalse();       // goal not set → never "met"
    }
}
