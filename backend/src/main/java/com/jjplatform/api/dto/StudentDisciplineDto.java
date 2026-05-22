package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class StudentDisciplineDto {
    private Long id;
    private Long studentId;
    private Long disciplineId;
    private String disciplineName;
    private Long ageCategoryId;
    private String ageCategoryName;
    private String belt;
    private String beltColorHex;
    private Integer stripes;
    private LocalDate joinDate;
    private Boolean active;
    private List<CompetitionResultDto> competitionResults;
}
