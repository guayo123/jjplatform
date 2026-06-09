package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class TrainingSubmissionDto {
    private String name;
    /** "LOGRADA" or "RECIBIDA". */
    private String direction;
}
