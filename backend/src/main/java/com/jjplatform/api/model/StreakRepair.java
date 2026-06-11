package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A used streak repair: fills one missed calendar day so the student's day-streak
 * survives the gap. Limited per month (see TrainingService); the repaired date counts
 * as "trained" only for streak math, never for session/volume stats.
 */
@Entity
@Table(name = "streak_repairs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "repaired_date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StreakRepair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    /** The missed calendar day this repair fills. */
    @Column(name = "repaired_date", nullable = false)
    private LocalDate repairedDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
