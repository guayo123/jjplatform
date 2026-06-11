package com.jjplatform.api.service;

import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.model.StreakRepair;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.TrainingSession;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.StreakRepairRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Streak math and repair rules: consecutive-day counting with the today-in-progress
 * grace, the 1-day-gap repair window, the monthly quota, and the client-date clamp.
 */
@ExtendWith(MockitoExtension.class)
class TrainingServiceStreakTest {

    private static final long STUDENT_ID = 1L;
    private static final LocalDate TODAY = LocalDate.now();

    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private DisciplineRepository disciplineRepository;
    @Mock private StreakRepairRepository repairRepository;

    private TrainingService service;

    @BeforeEach
    void setUp() {
        service = new TrainingService(sessionRepository, disciplineRepository, repairRepository);
    }

    // --- helpers -----------------------------------------------------------

    private void givenSessions(LocalDate... dates) {
        List<TrainingSession> sessions = new ArrayList<>();
        for (LocalDate d : dates) {
            TrainingSession s = new TrainingSession();
            s.setDate(d);
            sessions.add(s);
        }
        when(sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(anyLong())).thenReturn(sessions);
    }

    private void givenRepairs(StreakRepair... repairs) {
        when(repairRepository.findByStudentId(anyLong())).thenReturn(List.of(repairs));
    }

    private StreakRepair repairOf(LocalDate repairedDate, LocalDateTime createdAt) {
        StreakRepair r = new StreakRepair();
        r.setRepairedDate(repairedDate);
        r.setCreatedAt(createdAt);
        return r;
    }

    private TrainingSummaryDto summary() {
        return service.summary(STUDENT_ID, null, TODAY);
    }

    // --- streak counting ----------------------------------------------------

    @Test
    void countsConsecutiveDaysIncludingToday() {
        givenSessions(TODAY, TODAY.minusDays(1), TODAY.minusDays(2));
        givenRepairs();
        assertThat(summary().getCurrentStreak()).isEqualTo(3);
    }

    @Test
    void todayStillInProgressDoesNotBreakTheStreak() {
        givenSessions(TODAY.minusDays(1), TODAY.minusDays(2));
        givenRepairs();
        assertThat(summary().getCurrentStreak()).isEqualTo(2);
    }

    @Test
    void streakIsZeroWhenNeitherTodayNorYesterdayTrained() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3));
        givenRepairs();
        assertThat(summary().getCurrentStreak()).isZero();
    }

    @Test
    void maxStreakIsTheLongestHistoricalRun() {
        // Current run of 2, but an older run of 4.
        givenSessions(TODAY, TODAY.minusDays(1),
                TODAY.minusDays(10), TODAY.minusDays(11), TODAY.minusDays(12), TODAY.minusDays(13));
        givenRepairs();
        TrainingSummaryDto out = summary();
        assertThat(out.getCurrentStreak()).isEqualTo(2);
        assertThat(out.getMaxStreak()).isEqualTo(4);
    }

    @Test
    void duplicateSessionsOnTheSameDayCountOnce() {
        givenSessions(TODAY, TODAY, TODAY.minusDays(1));
        givenRepairs();
        assertThat(summary().getCurrentStreak()).isEqualTo(2);
    }

    // --- repaired days ------------------------------------------------------

    @Test
    void repairedDayFillsTheGapForStreakMath() {
        givenSessions(TODAY, TODAY.minusDays(2), TODAY.minusDays(3));
        givenRepairs(repairOf(TODAY.minusDays(1), LocalDateTime.now()));
        assertThat(summary().getCurrentStreak()).isEqualTo(4);
    }

    @Test
    void repairedDayDoesNotInflateSessionStats() {
        givenSessions(TODAY);
        givenRepairs(repairOf(TODAY.minusDays(1), LocalDateTime.now()));
        TrainingSummaryDto out = summary();
        assertThat(out.getMonthSessions()).isEqualTo(1); // only the real session
    }

    // --- repairable-gap detection -------------------------------------------

    @Test
    void yesterdayGapIsRepairableAndExposesTheLostStreak() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3), TODAY.minusDays(4));
        givenRepairs();
        TrainingSummaryDto out = summary();
        assertThat(out.getLostStreak()).isEqualTo(3);
        assertThat(out.isRepairAvailable()).isTrue();
        assertThat(out.getRepairsLeft()).isEqualTo(1);
    }

    @Test
    void dayBeforeYesterdayGapIsRepairableWhenTheStudentCameBackYesterday() {
        givenSessions(TODAY.minusDays(1), TODAY.minusDays(3), TODAY.minusDays(4));
        givenRepairs();
        TrainingSummaryDto out = summary();
        assertThat(out.getLostStreak()).isEqualTo(2);
        assertThat(out.isRepairAvailable()).isTrue();
    }

    @Test
    void twoDayGapIsNotRepairable() {
        givenSessions(TODAY.minusDays(3), TODAY.minusDays(4));
        givenRepairs();
        TrainingSummaryDto out = summary();
        assertThat(out.getLostStreak()).isZero();
        assertThat(out.isRepairAvailable()).isFalse();
    }

    @Test
    void noGapMeansNothingToRepair() {
        givenSessions(TODAY, TODAY.minusDays(1));
        givenRepairs();
        assertThat(summary().isRepairAvailable()).isFalse();
    }

    // --- monthly quota -------------------------------------------------------

    @Test
    void repairUsedThisMonthExhaustsTheQuota() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3));
        // createdAt today: guaranteed to land in the current month regardless of the date.
        givenRepairs(repairOf(TODAY.minusDays(20), LocalDateTime.now()));
        TrainingSummaryDto out = summary();
        // A gap exists (yesterday) but this month's repair is spent.
        assertThat(out.getLostStreak()).isPositive();
        assertThat(out.getRepairsLeft()).isZero();
        assertThat(out.isRepairAvailable()).isFalse();
    }

    @Test
    void repairFromAPreviousMonthDoesNotCountAgainstTheQuota() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3));
        givenRepairs(repairOf(TODAY.minusDays(60), LocalDateTime.now().minusDays(45)));
        assertThat(summary().getRepairsLeft()).isEqualTo(1);
    }

    // --- repairStreak --------------------------------------------------------

    @Test
    void repairStreakSavesTheGapDayAndRevivesTheStreak() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3));
        givenRepairs();
        Student student = new Student();
        student.setId(STUDENT_ID);

        service.repairStreak(student, null, TODAY);

        ArgumentCaptor<StreakRepair> captor = ArgumentCaptor.forClass(StreakRepair.class);
        verify(repairRepository).save(captor.capture());
        assertThat(captor.getValue().getRepairedDate()).isEqualTo(TODAY.minusDays(1));
        assertThat(captor.getValue().getStudent()).isSameAs(student);
    }

    @Test
    void repairStreakRejectsWhenThereIsNoRepairableGap() {
        givenSessions(TODAY, TODAY.minusDays(1));
        givenRepairs();
        Student student = new Student();
        student.setId(STUDENT_ID);

        assertThatThrownBy(() -> service.repairStreak(student, null, TODAY))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repairRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void repairStreakRejectsWhenTheMonthlyQuotaIsSpent() {
        givenSessions(TODAY.minusDays(2), TODAY.minusDays(3));
        givenRepairs(repairOf(TODAY.minusDays(15), LocalDateTime.now()));
        Student student = new Student();
        student.setId(STUDENT_ID);

        assertThatThrownBy(() -> service.repairStreak(student, null, TODAY))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repairRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    // --- client-date clamp ----------------------------------------------------

    @Test
    void clientDateMoreThanOneDayAwayFallsBackToServerDate() {
        // Trained yesterday and the day before. A device clock 10 days ahead must not
        // be able to claim "today" is far in the future (which would zero the streak).
        givenSessions(TODAY.minusDays(1), TODAY.minusDays(2));
        givenRepairs();
        TrainingSummaryDto out = service.summary(STUDENT_ID, null, TODAY.plusDays(10));
        assertThat(out.getCurrentStreak()).isEqualTo(2);
    }

    @Test
    void clientDateWithinOneDayIsRespected() {
        // For a device already on "tomorrow" (timezone ahead of the server), neither
        // its today nor its yesterday... its yesterday IS the server's today.
        givenSessions(TODAY, TODAY.minusDays(1));
        givenRepairs();
        TrainingSummaryDto out = service.summary(STUDENT_ID, null, TODAY.plusDays(1));
        // Client's today (server tomorrow) untrained, but client's yesterday (server today)
        // is trained — the in-progress-day grace keeps the streak alive at 2.
        assertThat(out.getCurrentStreak()).isEqualTo(2);
    }
}
