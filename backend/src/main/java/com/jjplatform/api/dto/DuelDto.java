package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** Full duel view for the portal (my duels + academy feed). */
@Data
public class DuelDto {
    private Long id;
    private String status;

    private Long challengerId;
    private String challengerName;
    private String challengerPhotoUrl;

    private Long opponentId;
    private String opponentName;
    private String opponentPhotoUrl;

    /** Impartial judge (null when the duel has no referee). */
    private Long refereeId;
    private String refereeName;

    private String format;
    private String modality;
    private String message;
    private LocalDateTime scheduledAt;
    private String location;

    private Long winnerStudentId;
    private String winnerName;
    private String method;
    private String submissionName;
    private Integer challengerScore;
    private Integer opponentScore;
    private String resultNotes;
    /** Who reported the result (so clients can avoid self-notifying the reporter). */
    private Long reportedBy;

    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
    private LocalDateTime completedAt;
}
