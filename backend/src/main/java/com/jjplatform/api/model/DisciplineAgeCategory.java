package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "discipline_age_categories")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DisciplineAgeCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_id", nullable = false)
    private Discipline discipline;

    @Column(nullable = false)
    private String name;

    private Integer minAge;

    private Integer maxAge;

    @Builder.Default
    private Integer displayOrder = 0;

    @Builder.Default
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<DisciplineBelt> belts = new ArrayList<>();
}
