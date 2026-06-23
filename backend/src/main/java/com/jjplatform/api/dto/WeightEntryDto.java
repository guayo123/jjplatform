package com.jjplatform.api.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class WeightEntryDto {
    private LocalDate date;
    private Double weightKg;
}
