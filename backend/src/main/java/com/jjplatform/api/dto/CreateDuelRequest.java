package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class CreateDuelRequest {
    private Long opponentStudentId;
    /** "GI" / "NOGI" / null. */
    private String modality;
    private String message;
}
