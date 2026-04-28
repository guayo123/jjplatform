package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "class_schedules")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ClassSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "professor_id")
    private Professor professor;

    @Column(nullable = false)
    private String dayOfWeek;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private String className;
}
