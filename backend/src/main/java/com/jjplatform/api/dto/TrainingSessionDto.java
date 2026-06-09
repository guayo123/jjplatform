package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Used both as the create request and the response for a training session. */
@Data
public class TrainingSessionDto {
    private Long id;
    private Long disciplineId;
    private String disciplineName;
    private LocalDate date;
    /** "GI" or "NOGI" (null for non-BJJ / unspecified). */
    private String modality;
    private Integer durationMin;
    private Integer roundsCount;
    private Integer energy;
    private Integer performance;
    private String notes;
    private List<String> techniques = new ArrayList<>();
    private List<TrainingSubmissionDto> submissions = new ArrayList<>();
    private List<TrainingPartnerDto> partners = new ArrayList<>();
    private LocalDateTime createdAt;
}
