package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "students", indexes = @Index(name = "idx_students_guardian_email", columnList = "guardian_email"))
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

    /**
     * Linked login user (created when the student self-registers for the portal). Null when the student
     * has no account. ManyToOne (not OneToOne) on purpose: a person enrolled in several academies has one
     * record per academy, all sharing the same login user, so user_id must NOT be unique.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    private String rut;

    private String email;

    private String phone;

    private LocalDate joinDate;

    /** Date of birth — drives the "birthdays this month" card in the student portal. Optional. */
    private LocalDate birthDate;

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

    /**
     * Guardian (apoderado) contact: the person who may log in to the portal to manage and pay for
     * this student (typically a parent). Registration matches guardianEmail + guardianRut.
     */
    private String guardianName;
    private String guardianEmail;
    private String guardianRut;

    /**
     * Standing monthly discount agreed with the academy (family discount, scholarship…): applied to
     * every online checkout and pre-filled when staff record a payment. Amount in CLP or percent.
     */
    @Column(precision = 10, scale = 2)
    private java.math.BigDecimal monthlyDiscount;

    /** AMOUNT | PERCENT. */
    @Column(length = 10)
    private String monthlyDiscountType;

    /** Shown to staff and on the receipt, e.g. "Descuento familiar". */
    @Column(length = 120)
    private String monthlyDiscountReason;

    /** Portal logins allowed to see/pay for this student besides {@link #user}. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "student_guardians",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private java.util.Set<User> guardians = new java.util.HashSet<>();

    private String bloodType;

    private String healthInsuranceType;

    private String healthInsuranceCompany;

    @Builder.Default
    private Boolean active = true;

    /**
     * Premium ("Pro") access valid through this date (inclusive). Null = never had it. Drives the
     * student's deep training-analytics tier. Granted manually by an admin for now; later a payment
     * webhook will extend it. See {@link #isPremium()}.
     */
    private LocalDate premiumUntil;

    /**
     * Last AI-coach analysis generated for this student (Pro feature). Cached daily: regenerated at most
     * once per {@link #coachInsightDate} so each student costs at most one AI call per day.
     */
    @Column(columnDefinition = "TEXT")
    private String coachInsight;

    /** Day {@link #coachInsight} was generated (device-local date). */
    private LocalDate coachInsightDate;

    /** Last date an automatic payment reminder was sent (dedupe so we don't message more than once a month). */
    private LocalDate lastPaymentReminderAt;

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

    /** Pro is active when premiumUntil is today or later. */
    public boolean isPremium() {
        return premiumUntil != null && !premiumUntil.isBefore(LocalDate.now());
    }
}
