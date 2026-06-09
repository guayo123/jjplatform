package com.jjplatform.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/**
 * A training partner logged within a session. Name and belt are snapshotted (denormalized)
 * so the record reflects who/what they were at training time even if their belt changes later.
 * partnerStudentId optionally links to the real classmate's student record.
 */
@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class TrainingPartner {

    @Column(nullable = false)
    private String name;

    private String belt;

    /** Optional link to the classmate's Student id (when picked from the academy roster). */
    private Long partnerStudentId;
}
