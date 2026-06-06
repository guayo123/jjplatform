package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /** For PROFESOR / ENCARGADO staff: the academy they belong to. Null for ADMIN. */
    @Column(name = "academy_id")
    private Long academyId;

    /** True when the user was created with a temporary password and must change it before using the app. */
    @Column(name = "must_change_password", nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private Boolean mustChangePassword = false;

    /** Student portal cover/banner preference (one of: japones, jiujitsu, minimal). Null = no banner. */
    @Column(name = "portal_banner")
    private String portalBanner;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Academy academy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum Role {
        ADMIN, SUPER_ADMIN,
        /** Can only view data */
        PROFESOR,
        /** Can register payments and toggle student active status */
        ENCARGADO,
        /** Self-registered student: can only view their own student record via the portal */
        STUDENT
    }
}
