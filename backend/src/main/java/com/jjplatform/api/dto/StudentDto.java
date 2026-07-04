package com.jjplatform.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class StudentDto {
    private Long id;

    /** Owning academy — used by the student portal selector when a person belongs to several academies. */
    private Long academyId;
    private String academyName;

    @NotBlank(message = "Name is required")
    private String name;

    private String rut;

    @jakarta.validation.constraints.Email(message = "Invalid email format")
    private String email;

    private String phone;

    private String joinDate;

    /** ISO date (yyyy-MM-dd) of birth. Optional. */
    private String birthDate;

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

    /** Premium ("Pro") access expiry (yyyy-MM-dd) and whether it's currently active. */
    private String premiumUntil;
    private Boolean isPremium;

    private List<Long> planIds;
    private List<PlanInfo> enrolledPlans;
    private List<DisciplineBeltInfo> disciplineBelts;

    @Data
    public static class PlanInfo {
        private Long id;
        private String name;
        private String disciplineName;
        private Integer price;
        private Long professorId;
        private String professorName;
    }

    @Data
    public static class DisciplineBeltInfo {
        private Long disciplineId;
        private String disciplineName;
        private String belt;
        private Integer stripes;
        private String beltColorHex;
    }
}
