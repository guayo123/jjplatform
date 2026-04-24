package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
