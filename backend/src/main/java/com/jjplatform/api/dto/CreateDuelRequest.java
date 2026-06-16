package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class CreateDuelRequest {
    private Long opponentStudentId;
    /** Optional impartial judge (a third classmate). When set, only they report the result. */
    private Long refereeStudentId;
    /** "GI" / "NOGI" / null. */
    private String modality;
    private String message;
}
