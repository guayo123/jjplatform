package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "competition_results")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CompetitionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_discipline_id", nullable = false)
    private StudentDiscipline studentDiscipline;

    @Column(nullable = false)
    private String tournamentName;

    @Column(nullable = false)
    private LocalDate date;

    private String placement;

    private String category;

    // Snapshot del cinturón del alumno al momento de la competición
    private String beltAtCompetition;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer stripesAtCompetition = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
