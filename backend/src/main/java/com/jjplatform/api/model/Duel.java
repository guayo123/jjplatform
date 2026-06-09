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

    /** How the duel finished. */
    public enum Method { SUBMISSION, POINTS, DECISION, DRAW }

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

    // --- Result (set when COMPLETED) -------------------------------------

    /** Winner's student id; null means a draw. Always one of challenger/opponent otherwise. */
    private Long winnerStudentId;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
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
