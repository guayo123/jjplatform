package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "student_disciplines",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "discipline_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StudentDiscipline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_id", nullable = false)
    private Discipline discipline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "age_category_id")
    private DisciplineAgeCategory ageCategory;

    private String belt;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer stripes = 0;

    private LocalDate joinDate;

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    @OneToMany(mappedBy = "studentDiscipline", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompetitionResult> competitionResults = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
