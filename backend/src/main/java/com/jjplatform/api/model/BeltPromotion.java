package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "belt_promotions")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BeltPromotion {

    public enum PromotionType { PROMOCION, DEGRADACION, GRADO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'PROMOCION'")
    private PromotionType type;

    private String fromBelt;
    private Integer fromStripes;

    @Column(nullable = false)
    private String toBelt;

    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer toStripes = 0;

    @Column(nullable = false)
    private LocalDate promotionDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String performedBy;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean deletable = true;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean deleted = false;

    private String deletedBy;

    @Column(columnDefinition = "TEXT")
    private String deletedReason;

    private LocalDate deletedAt;
}
