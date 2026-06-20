package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A strength & conditioning session for the student portal (gym / physical prep). */
@Data
public class ConditioningSessionDto {
    private Long id;
    private LocalDate date;
    private Boolean backdated;
    /** "PIERNA" / "ESPALDA" / "PECHO" / "HOMBRO" / "BRAZO" / "CORE" / "CARDIO" / "FULL_BODY". */
    private String focus;
    private Integer durationMin;
    private String notes;
    private List<ConditioningExerciseDto> exercises = new ArrayList<>();
    private LocalDateTime createdAt;

    @Data
    public static class ConditioningExerciseDto {
        private String name;
        private Integer restSec;
        private List<ConditioningSetDto> sets = new ArrayList<>();
    }

    @Data
    public static class ConditioningSetDto {
        private Integer reps;
        private Double weightKg;
    }
}
