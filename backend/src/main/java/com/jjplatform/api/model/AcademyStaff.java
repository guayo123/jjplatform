package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "academy_staff",
       uniqueConstraints = @UniqueConstraint(columnNames = {"academy_id", "user_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AcademyStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "academy_id", nullable = false)
    private Long academyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
