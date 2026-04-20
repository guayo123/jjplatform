package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "academies")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Academy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String address;

    private String phone;

    private String logoUrl;

    private String whatsapp;

    private String instagram;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @OneToMany(mappedBy = "academy", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Student> students = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "academy", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClassSchedule> schedules = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "academy", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Tournament> tournaments = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "academy", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Photo> photos = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "academy", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Plan> plans = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
