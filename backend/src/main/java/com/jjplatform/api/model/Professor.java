package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "professors")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Professor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @Column(nullable = false)
    private String name;

    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(columnDefinition = "TEXT")
    private String achievements;

    private String belt;

    private Integer displayOrder;

    @Builder.Default
    private Boolean active = true;
}
