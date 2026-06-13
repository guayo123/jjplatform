package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechniqueDto {
    private Long id;
    private Long beltId;
    private String name;
    private String description;
    private String position;
    private String videoUrl;
    private Integer displayOrder;
    /** Portal only: whether the requesting student has marked this technique learned. */
    private Boolean learned;
    /** Portal only: when it was marked learned. */
    private LocalDate learnedAt;
}
