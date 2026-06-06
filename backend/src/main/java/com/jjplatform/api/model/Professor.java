package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Student;

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

    private Integer displayOrder;

    @Builder.Default
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discipline_id")
    private Discipline discipline;

    /** Optional contact email; when null, the linked student's email is used (if any). */
    @Column(name = "email")
    private String email;

    /** Linked login user (created via grant-access). Null when the professor has no system account. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
