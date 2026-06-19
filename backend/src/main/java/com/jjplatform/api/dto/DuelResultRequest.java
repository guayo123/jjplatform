package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class DuelResultRequest {
    /** Winner student id; null = draw. Must be one of the two participants otherwise. */
    private Long winnerStudentId;
    /** "SUBMISSION" / "POINTS" / "DECISION" / "DRAW". */
    private String method;
    private String submissionName;
    /** Each fighter's score when method = POINTS. */
    private Integer challengerScore;
    private Integer opponentScore;
    private String notes;
}
