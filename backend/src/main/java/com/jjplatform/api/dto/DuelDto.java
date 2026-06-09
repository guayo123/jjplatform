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

    private String modality;
    private String message;

    private Long winnerStudentId;
    private String winnerName;
    private String method;
    private String submissionName;
    private String resultNotes;

    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
    private LocalDateTime completedAt;
}
