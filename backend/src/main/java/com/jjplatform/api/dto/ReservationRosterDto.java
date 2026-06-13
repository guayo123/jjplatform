package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A student who reserved a given class occurrence (admin roster view). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRosterDto {
    private Long studentId;
    private String name;
    private String photoUrl;
    private String belt;
}
