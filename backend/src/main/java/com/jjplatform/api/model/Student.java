package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "students")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @Column(nullable = false)
    private String name;

    private String rut;

    private String email;

    private String phone;

    private LocalDate joinDate;

    private Integer age;

    private Double weight;

    private String belt;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer stripes = 0;

    private String photoUrl;

    private String address;

    @Column(columnDefinition = "TEXT")
    private String medicalNotes;

    private String nickname;

    private String emergencyPhone;

    private String bloodType;

    private String healthInsuranceType;

    private String healthInsuranceCompany;

    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "student_plans",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "plan_id")
    )
    @Builder.Default
    private List<Plan> plans = new ArrayList<>();
}
