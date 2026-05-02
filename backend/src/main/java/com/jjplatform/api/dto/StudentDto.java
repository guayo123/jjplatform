package com.jjplatform.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class StudentDto {
    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    private String rut;

    @jakarta.validation.constraints.Email(message = "Invalid email format")
    private String email;

    private String phone;

    private String joinDate;

    @Min(value = 1, message = "Age must be positive")
    private Integer age;

    private Double weight;

    private String belt;
    private Integer stripes;

    private String photoUrl;
    private String address;
    private String medicalNotes;
    private String nickname;
    private String emergencyPhone;
    private String bloodType;
    private String healthInsuranceType;
    private String healthInsuranceCompany;
    private Boolean active;

    private List<Long> planIds;
    private List<PlanInfo> enrolledPlans;

    @Data
    public static class PlanInfo {
        private Long id;
        private String name;
        private String disciplineName;
        private Integer price;
        private Long professorId;
        private String professorName;
    }
}
