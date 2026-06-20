package com.jjplatform.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/**
 * One logged set inside a conditioning session, tagged with the exercise it belongs to.
 * Stored flat (a session has a list of these); the API regroups them into exercises by
 * {@code exerciseOrder}. {@code restSec} is the exercise's rest (same across its sets).
 */
@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ExerciseSet {

    @Column(nullable = false)
    private String exerciseName;

    /** Groups sets into exercises and preserves the exercise order within the session. */
    @Column(nullable = false)
    private Integer exerciseOrder;

    /** Rest between sets for this exercise, in seconds (optional). */
    private Integer restSec;

    private Integer reps;

    private Double weightKg;
}
