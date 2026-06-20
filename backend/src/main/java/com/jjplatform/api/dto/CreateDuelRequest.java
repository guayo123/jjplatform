package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateDuelRequest {
    private Long opponentStudentId;
    /** Optional impartial judge (a third classmate). When set, only they report the result. */
    private Long refereeStudentId;
    /** Bout format: "SUBMISSION" / "COMBAT_JJ" / "MMA" / "NO_RULES" / null. */
    private String format;
    /** "GI" / "NOGI" / null. Only used when format = SUBMISSION. */
    private String modality;
    private String message;
    /** Optional agreed date/time for the bout (challenger's local time, ISO without offset). */
    private LocalDateTime scheduledAt;
    /** Optional agreed place for the bout. */
    private String location;
}
