package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A student's reserved spot in one dated occurrence of a recurring {@link ClassSchedule}.
 * Unique per (schedule, student, classDate) so a student can't double-book the same session.
 */
@Entity
@Table(name = "class_reservations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"schedule_id", "student_id", "class_date"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClassReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private ClassSchedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "class_date", nullable = false)
    private LocalDate classDate;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
