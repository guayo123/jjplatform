package com.jjplatform.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StudentDto {
    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    @Min(value = 1, message = "Age must be positive")
    private Integer age;

    private String photoUrl;
    private String address;
    private String medicalNotes;
    private Boolean active;
}
