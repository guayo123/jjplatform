package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bracket_matches")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BracketMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tournament_id", nullable = false)
    private Tournament tournament;

    @Column(nullable = false)
    private Integer round;

    @Column(nullable = false)
    private Integer matchNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant1_id")
    private TournamentParticipant participant1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant2_id")
    private TournamentParticipant participant2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private TournamentParticipant winner;

    @Enumerated(EnumType.STRING)
    private MatchResultType resultType;

    @Column(name = "category_group")
    private String categoryGroup;

    public enum MatchResultType {
        SUMISION, PUNTOS, VENTAJAS, PENALIZACIONES, DECISION_ARBITRO, DESCALIFICACION
    }
}
