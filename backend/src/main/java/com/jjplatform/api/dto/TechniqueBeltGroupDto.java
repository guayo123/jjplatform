package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** One belt's slice of a student's technique curriculum. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechniqueBeltGroupDto {
    private Long beltId;
    private String beltName;
    private String beltColorHex;
    private Integer displayOrder;
    /** True for the student's current belt. */
    private boolean current;
    /** True for the current belt and every belt the student already passed. */
    private boolean reached;
    private int totalCount;
    private int learnedCount;
    private List<TechniqueDto> techniques;
}
