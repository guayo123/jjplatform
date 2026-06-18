package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A challenge ("reto") between two students of the same academy to roll/spar. Flows
 * PENDING → ACCEPTED → COMPLETED (with a winner & method), or PENDING → REJECTED /
 * CANCELLED. Completed and rejected duels surface in the academy feed.
 */
@Entity
@Table(name = "duels")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Duel {

    public enum Status { PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED }

    /** How the duel finished. DISQUALIFICATION = the other participant was disqualified. */
    public enum Method { SUBMISSION, POINTS, DECISION, DRAW, DISQUALIFICATION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenger_id", nullable = false)
    private Student challenger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opponent_id", nullable = false)
    private Student opponent;

    /**
     * Optional impartial third student who judges the bout. When set, only the referee may
     * report the result (so a loser can't claim the win); when null, either participant can.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referee_id")
    private Student referee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private Status status = Status.PENDING;

    /** "GI" / "NOGI" / null. */
    @Column(length = 10)
    private String modality;

    /** Optional trash-talk / message from the challenger. */
    @Column(columnDefinition = "TEXT")
    private String message;

    /** Optional agreed date/time for the bout (challenger's local time). */
    private LocalDateTime scheduledAt;

    /** Optional agreed place for the bout (e.g. "Tatami 2", "Academia central"). */
    @Column(length = 120)
    private String location;

    // --- Result (set when COMPLETED) -------------------------------------

    /** Winner's student id; null means a draw. Always one of challenger/opponent otherwise. */
    private Long winnerStudentId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Method method;

    /** Submission name when method = SUBMISSION. */
    private String submissionName;

    @Column(columnDefinition = "TEXT")
    private String resultNotes;

    /** Student id who reported the result (audit / trust). */
    private Long reportedBy;

    private LocalDateTime respondedAt;
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
