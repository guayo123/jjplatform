package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** A student's full technique program for one discipline, grouped by belt. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechniqueCurriculumDto {
    private Long disciplineId;
    private String disciplineName;
    private String ageCategoryName;
    private String currentBelt;
    private int totalCount;
    private int learnedCount;
    private List<TechniqueBeltGroupDto> belts;
}
