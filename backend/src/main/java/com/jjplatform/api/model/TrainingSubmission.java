package com.jjplatform.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

/**
 * A single submission logged within a training session, with its direction:
 * LOGRADA (the student submitted someone) vs RECIBIDA (the student was submitted).
 * Direction is what makes the data useful for attack-vs-defense analysis.
 */
@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class TrainingSubmission {

    public enum Direction { LOGRADA, RECIBIDA }

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Direction direction;
}
