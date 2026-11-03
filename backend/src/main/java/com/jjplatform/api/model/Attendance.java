package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A student's attendance at the dojo on a given day: either to one occurrence of a recurring
 * {@link ClassSchedule} or, when no class was running at check-in time, a free session (schedule null).
 * At most one row per (student, schedule, date) and one free row per (student, date) — enforced by partial
 * unique indexes in SchemaPatches, since a plain UNIQUE treats NULL schedules as distinct.
 */
@Entity
@Table(name = "attendances",
       indexes = {
           @Index(name = "idx_attendances_academy_date", columnList = "academy_id, attended_on"),
           @Index(name = "idx_attendances_student_date", columnList = "student_id, attended_on")
       })
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Attendance {

    public enum Source { QR, MANUAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    /** Null = free session (open mat / no class running at check-in time). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private ClassSchedule schedule;

    @Column(name = "attended_on", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalDateTime checkedInAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Source source;
}
