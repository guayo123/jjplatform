package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Marks that a student has learned a curriculum {@link Technique}. One row per
 * (student, technique); absence of a row means "not learned yet".
 */
@Entity
@Table(name = "student_techniques",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "technique_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StudentTechnique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technique_id", nullable = false)
    private Technique technique;

    @Builder.Default
    private LocalDate learnedAt = LocalDate.now();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
