package com.jjplatform.api.service;

import com.jjplatform.api.dto.TrainingPartnerDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.TrainingSubmissionDto;
import com.jjplatform.api.dto.TrainingSummaryDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.StreakRepair;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.TrainingPartner;
import com.jjplatform.api.model.TrainingSession;
import com.jjplatform.api.model.TrainingSubmission;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.StreakRepairRepository;
import com.jjplatform.api.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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

    /** Streak repairs each student can spend per calendar month. */
    public static final int REPAIRS_PER_MONTH = 1;

    private final TrainingSessionRepository sessionRepository;
    private final DisciplineRepository disciplineRepository;
    private final StreakRepairRepository repairRepository;

    @Transactional
    public TrainingSessionDto create(Student student, TrainingSessionDto dto) {
        TrainingSession s = new TrainingSession();
        s.setStudent(student);
        s.setDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
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

    public TrainingSummaryDto summary(Long studentId, Integer weeklyGoal, LocalDate clientToday) {
        LocalDate today = effectiveToday(clientToday);
        List<TrainingSession> all = sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId);
        List<StreakRepair> repairs = repairRepository.findByStudentId(studentId);

        TrainingSummaryDto out = new TrainingSummaryDto();
        out.setWeeklyGoal(weeklyGoal);

        // Distinct calendar days trained (for the day-streak) and sessions in the current ISO week.
        Set<LocalDate> trainedDays = new HashSet<>();
        int thisWeekCount = 0, monthSessions = 0, monthMinutes = 0, monthRounds = 0;
        String currentWeek = weekKey(today);
        for (TrainingSession s : all) {
            trainedDays.add(s.getDate());
            if (weekKey(s.getDate()).equals(currentWeek)) thisWeekCount++;
            if (s.getDate().getYear() == today.getYear() && s.getDate().getMonthValue() == today.getMonthValue()) {
                monthSessions++;
                if (s.getDurationMin() != null) monthMinutes += s.getDurationMin();
                if (s.getRoundsCount() != null) monthRounds += s.getRoundsCount();
            }
        }

        out.setThisWeekCount(thisWeekCount);
        out.setMonthSessions(monthSessions);
        out.setMonthMinutes(monthMinutes);
        out.setMonthRounds(monthRounds);

        // Repaired days count as trained for streak math only — never for session/volume stats.
        Set<LocalDate> streakDays = new HashSet<>(trainedDays);
        for (StreakRepair r : repairs) streakDays.add(r.getRepairedDate());

        out.setCurrentStreak(currentDayStreak(streakDays, today));
        out.setMaxStreak(maxDayStreak(streakDays));
        out.setWeeklyGoalMet(weeklyGoal != null && weeklyGoal > 0 && thisWeekCount >= weeklyGoal);

        int repairsLeft = repairsLeft(repairs, today);
        LocalDate gap = repairableGapDay(streakDays, today);
        int lostStreak = gap == null ? 0 : runEndingAt(streakDays, gap.minusDays(1));
        out.setLostStreak(lostStreak);
        out.setRepairsLeft(repairsLeft);
        out.setRepairAvailable(lostStreak > 0 && repairsLeft > 0);
        return out;
    }

    /**
     * Spends a monthly repair to fill the current 1-day gap, reviving the streak that broke.
     * Validates the gap still exists and quota remains; returns the refreshed summary.
     */
    @Transactional
    public TrainingSummaryDto repairStreak(Student student, Integer weeklyGoal, LocalDate clientToday) {
        LocalDate today = effectiveToday(clientToday);
        List<StreakRepair> repairs = repairRepository.findByStudentId(student.getId());

        Set<LocalDate> streakDays = new HashSet<>();
        for (TrainingSession s : sessionRepository.findByStudentIdOrderByDateDescCreatedAtDesc(student.getId())) {
            streakDays.add(s.getDate());
        }
        for (StreakRepair r : repairs) streakDays.add(r.getRepairedDate());

        LocalDate gap = repairableGapDay(streakDays, today);
        if (gap == null) {
            throw new IllegalArgumentException("No hay ninguna racha que recuperar ahora mismo.");
        }
        if (repairsLeft(repairs, today) <= 0) {
            throw new IllegalArgumentException("Ya usaste tu recuperación de racha de este mes.");
        }

        StreakRepair repair = new StreakRepair();
        repair.setStudent(student);
        repair.setRepairedDate(gap);
        repairRepository.save(repair);

        return summary(student.getId(), weeklyGoal, today);
    }

    // --- streak math -------------------------------------------------------

    /**
     * Consecutive calendar days trained up to now. Not training today does not break the
     * streak while the day is still in progress: if there's no session today we start
     * counting from yesterday instead. Returns 0 if neither today nor yesterday was trained.
     */
    private int currentDayStreak(Set<LocalDate> days, LocalDate today) {
        LocalDate cursor;
        if (days.contains(today)) {
            cursor = today;
        } else if (days.contains(today.minusDays(1))) {
            cursor = today.minusDays(1); // today still in progress — don't penalize
        } else {
            return 0;
        }
        int streak = 0;
        while (days.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    /** Longest run of consecutive trained days across the whole history. */
    private int maxDayStreak(Set<LocalDate> days) {
        int best = 0;
        for (LocalDate d : days) {
            if (days.contains(d.minusDays(1))) continue; // not the start of a run
            int run = 0;
            for (LocalDate c = d; days.contains(c); c = c.plusDays(1)) run++;
            best = Math.max(best, run);
        }
        return best;
    }

    /**
     * The single missed day that can still be repaired, or null. Only a 1-day gap counts,
     * and only within ~48h of the break: the gap must be yesterday (run ended at D-2), or
     * the day before yesterday with yesterday already trained (the student came back on
     * their own but the hole is still fresh).
     */
    private LocalDate repairableGapDay(Set<LocalDate> days, LocalDate today) {
        LocalDate yesterday = today.minusDays(1);
        if (!days.contains(yesterday) && days.contains(today.minusDays(2))) {
            return yesterday;
        }
        if (days.contains(yesterday) && !days.contains(today.minusDays(2)) && days.contains(today.minusDays(3))) {
            return today.minusDays(2);
        }
        return null;
    }

    /** Length of the consecutive run of trained days ending exactly at {@code end}. */
    private int runEndingAt(Set<LocalDate> days, LocalDate end) {
        int run = 0;
        for (LocalDate c = end; days.contains(c); c = c.minusDays(1)) run++;
        return run;
    }

    /** Repairs remaining in {@code today}'s calendar month. */
    private int repairsLeft(List<StreakRepair> repairs, LocalDate today) {
        YearMonth month = YearMonth.from(today);
        long used = repairs.stream()
                .filter(r -> r.getCreatedAt() != null && YearMonth.from(r.getCreatedAt()).equals(month))
                .count();
        return (int) Math.max(0, REPAIRS_PER_MONTH - used);
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
            throw new IllegalArgumentException("Modalidad no válida (GI/NOGI).");
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
