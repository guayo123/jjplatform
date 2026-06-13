package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * A single curriculum technique attached to one belt of a discipline's age category.
 * Academies build a per-belt program (e.g. "Armbar desde la guardia" under White belt);
 * students see the program for their discipline and tick off what they've learned.
 */
@Entity
@Table(name = "techniques")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Technique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_belt_id", nullable = false)
    private DisciplineBelt disciplineBelt;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Position / family label, e.g. "Guardia", "Montada", "Sumisión". */
    private String position;

    /** Optional link to a demo video (YouTube/Vimeo/etc.). */
    @Column(length = 500)
    private String videoUrl;

    @Builder.Default
    private Integer displayOrder = 0;

    @Builder.Default
    private Boolean active = true;
}
