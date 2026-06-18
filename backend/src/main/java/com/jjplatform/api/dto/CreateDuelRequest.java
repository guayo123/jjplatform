package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateDuelRequest {
    private Long opponentStudentId;
    /** Optional impartial judge (a third classmate). When set, only they report the result. */
    private Long refereeStudentId;
    /** "GI" / "NOGI" / null. */
    private String modality;
    private String message;
    /** Optional agreed date/time for the bout (challenger's local time, ISO without offset). */
    private LocalDateTime scheduledAt;
    /** Optional agreed place for the bout. */
    private String location;
}
