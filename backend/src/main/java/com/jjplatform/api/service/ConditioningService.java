package com.jjplatform.api.service;

import com.jjplatform.api.dto.ConditioningSessionDto;
import com.jjplatform.api.dto.ConditioningSessionDto.ConditioningExerciseDto;
import com.jjplatform.api.dto.ConditioningSessionDto.ConditioningSetDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.ConditioningSession;
import com.jjplatform.api.model.ExerciseSet;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.ConditioningSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Self-logged strength & conditioning sessions (gym / physical prep), parallel to the BJJ
 * journal. Sets are stored flat on the session and regrouped into exercises for the API.
 */
@Service
@RequiredArgsConstructor
public class ConditioningService {

    private final ConditioningSessionRepository repository;

    @Transactional
    public ConditioningSessionDto create(Student student, ConditioningSessionDto dto) {
        ConditioningSession s = new ConditioningSession();
        s.setStudent(student);
        // The device decides the date and whether it's a late entry (same as the BJJ journal).
        s.setDate(dto.getDate() != null ? dto.getDate() : LocalDate.now());
        s.setBackdated(Boolean.TRUE.equals(dto.getBackdated()));
        s.setFocus(parseFocus(dto.getFocus()));
        s.setDurationMin(clampPositive(dto.getDurationMin()));
        s.setNotes(trimNotes(dto.getNotes()));

        int exOrder = 0;
        for (ConditioningExerciseDto ex : dto.getExercises()) {
            if (ex == null || ex.getName() == null || ex.getName().isBlank()) continue;
            String name = ex.getName().trim();
            Integer rest = clampPositive(ex.getRestSec());
            for (ConditioningSetDto set : ex.getSets()) {
                if (set == null) continue;
                ExerciseSet es = new ExerciseSet();
                es.setExerciseName(name);
                es.setExerciseOrder(exOrder);
                es.setRestSec(rest);
                es.setReps(clampPositive(set.getReps()));
                Double weightKg = set.getWeightKg();
                if (weightKg != null && weightKg < 0) weightKg = 0.0;
                es.setWeightKg(weightKg);
                s.getSets().add(es);
            }
            exOrder++;
        }
        return toDto(repository.save(s));
    }

    public List<ConditioningSessionDto> listByStudent(Long studentId) {
        return repository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public void delete(Long studentId, Long sessionId) {
        ConditioningSession s = repository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sesión no encontrada"));
        if (!s.getStudent().getId().equals(studentId)) {
            throw new ResourceNotFoundException("Sesión no encontrada");
        }
        repository.delete(s);
    }

    /** Raw entity list — used by TrainingService to fold conditioning into the weekly count + streak. */
    @Transactional(readOnly = true)
    public List<ConditioningSession> listSessions(Long studentId) {
        return repository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId);
    }

    /** Dates with a non-backdated conditioning session — folded into the unified day-streak. */
    @Transactional(readOnly = true)
    public Set<LocalDate> trainedDates(Long studentId) {
        Set<LocalDate> dates = new HashSet<>();
        for (ConditioningSession s : repository.findByStudentIdOrderByDateDescCreatedAtDesc(studentId)) {
            if (!s.isBackdated()) dates.add(s.getDate());
        }
        return dates;
    }

    /**
     * Non-backdated conditioning dates per student for a whole academy, used by the leaderboard
     * so gym days count toward the streak the same way they do in each student's personal summary.
     * Returns a map of studentId → set of trained dates.
     */
    @Transactional(readOnly = true)
    public Map<Long, Set<LocalDate>> trainedDatesByAcademy(Long academyId, LocalDate from) {
        Map<Long, Set<LocalDate>> result = new java.util.HashMap<>();
        for (ConditioningSession s : repository.findByStudentAcademyIdAndBackdatedFalseAndDateGreaterThanEqual(academyId, from)) {
            result.computeIfAbsent(s.getStudent().getId(), k -> new HashSet<>()).add(s.getDate());
        }
        return result;
    }

    private ConditioningSessionDto toDto(ConditioningSession s) {
        ConditioningSessionDto dto = new ConditioningSessionDto();
        dto.setId(s.getId());
        dto.setDate(s.getDate());
        dto.setBackdated(s.isBackdated());
        dto.setFocus(s.getFocus() != null ? s.getFocus().name() : null);
        dto.setDurationMin(s.getDurationMin());
        dto.setNotes(s.getNotes());
        dto.setCreatedAt(s.getCreatedAt());

        // Regroup the flat sets into exercises by exerciseOrder (TreeMap keeps the order).
        Map<Integer, ConditioningExerciseDto> byOrder = new TreeMap<>();
        for (ExerciseSet es : s.getSets()) {
            ConditioningExerciseDto ex = byOrder.computeIfAbsent(es.getExerciseOrder(), k -> {
                ConditioningExerciseDto e = new ConditioningExerciseDto();
                e.setName(es.getExerciseName());
                e.setRestSec(es.getRestSec());
                return e;
            });
            ConditioningSetDto set = new ConditioningSetDto();
            set.setReps(es.getReps());
            set.setWeightKg(es.getWeightKg());
            ex.getSets().add(set);
        }
        dto.setExercises(new ArrayList<>(byOrder.values()));
        return dto;
    }

    private ConditioningSession.Focus parseFocus(String v) {
        if (v == null || v.isBlank()) return null;
        try {
            return ConditioningSession.Focus.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Foco no válido.");
        }
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
