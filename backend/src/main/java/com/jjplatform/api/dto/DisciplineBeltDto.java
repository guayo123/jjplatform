package com.jjplatform.api.dto;

import lombok.Data;

@Data
public class DisciplineBeltDto {
    private Long id;
    private String name;
    private String colorHex;
    private Integer displayOrder;
}
