package com.jjplatform.api.dto;

import lombok.Data;

import java.util.List;

@Data
public class DisciplineAgeCategoryDto {
    private Long id;
    private Long disciplineId;
    private String name;
    private Integer minAge;
    private Integer maxAge;
    private Integer displayOrder;
    private List<DisciplineBeltDto> belts;
}
