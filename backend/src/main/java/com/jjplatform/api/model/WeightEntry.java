package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "weight_entries", uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class WeightEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private Double weightKg;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
