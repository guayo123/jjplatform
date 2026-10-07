package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tournament_participants",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "student_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TournamentParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    private Integer seed;

    /** Cabeza de serie elegido por el organizador (1 = mejor). Null = sin cabeza de serie, entra por sorteo. */
    @Column(name = "seed_rank")
    private Integer seedRank;

    /** Categoría de edad calculada al momento de la inscripción */
    private String ageCategory;

    /** Categoría de peso calculada al momento de la inscripción */
    private String weightCategory;
}
