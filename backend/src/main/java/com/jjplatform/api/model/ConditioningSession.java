package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A self-logged strength & conditioning session (gym / physical prep), parallel to the BJJ
 * {@link TrainingSession}. Counts toward the SAME day-streak so any training day — mat or gym —
 * keeps the streak alive. Sets are stored flat and regrouped into exercises by the API.
 */
@Entity
@Table(name = "conditioning_sessions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ConditioningSession {

    /** Muscle group / day focus. */
    public enum Focus { PIERNA, ESPALDA, PECHO, HOMBRO, BRAZO, CORE, CARDIO, FULL_BODY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate date;

    /** Logged late for a past day: counts for history/volume but never toward the day-streak. */
    @Column(columnDefinition = "boolean default false")
    private boolean backdated;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Focus focus;

    private Integer durationMin;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "conditioning_session_sets", joinColumns = @JoinColumn(name = "session_id"))
    private List<ExerciseSet> sets = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
