package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "discipline_belts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DisciplineBelt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private DisciplineAgeCategory category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String colorHex;

    @Builder.Default
    private Integer displayOrder = 0;
}
