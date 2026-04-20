package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "plans")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer price;

    // Detalles adicionales separados por salto de línea
    @Column(columnDefinition = "TEXT")
    private String features;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    private Integer displayOrder;
}
