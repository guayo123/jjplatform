package com.jjplatform.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BeltPromotionDto {
    private Long id;

    @NotNull(message = "Student ID is required")
    private Long studentId;

    private String studentName;
    private String studentPhotoUrl;

    private String fromBelt;
    private Integer fromStripes;

    private String toBelt;
    private Integer toStripes;

    @NotNull(message = "Promotion date is required")
    private String promotionDate;

    private String notes;
    private String type;
    private String performedBy;
    private Boolean deletable;
}
