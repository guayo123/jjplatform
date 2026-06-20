package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A self-logged training session by a STUDENT (their personal training journal).
 * Distinct from academy-managed records (belts, payments): this is reported by the
 * student themselves and powers the streak / weekly-goal engagement loop.
 */
@Entity
@Table(name = "training_sessions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TrainingSession {

    /** Session type: Gi / No-Gi training, open mat, or a competition. Null for others / unspecified. */
    public enum Modality { GI, NOGI, OPEN_MAT, COMPETITION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    /** Optional link to one of the student's disciplines (e.g. BJJ, Muay Thai). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_id")
    private Discipline discipline;

    @Column(nullable = false)
    private LocalDate date;

    /**
     * True when the session was logged late for a past date (backdating, "Ayer"/"Anteayer").
     * Backdated sessions count for history/volume stats but NEVER toward the day-streak.
     */
    @Column(columnDefinition = "boolean default false")
    private boolean backdated;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Modality modality;

    private Integer durationMin;

    /** Number of sparring rounds. */
    private Integer roundsCount;

    /** Self-rated energy 1-5. */
    private Integer energy;

    /** Self-rated performance 1-5. */
    private Integer performance;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "training_session_techniques", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "technique")
    private List<String> techniques = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "training_session_submissions", joinColumns = @JoinColumn(name = "session_id"))
    private List<TrainingSubmission> submissions = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "training_session_partners", joinColumns = @JoinColumn(name = "session_id"))
    private List<TrainingPartner> partners = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
