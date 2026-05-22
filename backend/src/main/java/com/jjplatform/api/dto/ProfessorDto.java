package com.jjplatform.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProfessorDto {
    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    private String photoUrl;
    private String bio;
    private String achievements;
    private String belt;
    private Integer displayOrder;
    private Boolean active;
    private Long studentId;
    private String studentName;

    @NotNull(message = "Discipline is required")
    private Long disciplineId;
    private String disciplineName;
}
