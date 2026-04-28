package com.jjplatform.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentDto {
    private Long id;

    @NotNull(message = "Student ID is required")
    private Long studentId;

    private String studentName;

    private BigDecimal expectedAmount;

    @NotNull(message = "Amount is required")
    @Min(value = 0, message = "Amount must be positive")
    private BigDecimal amount;

    private BigDecimal discount;
    private String discountType;

    private BigDecimal remaining;

    @NotNull(message = "Month is required")
    @Min(value = 1)
    private Integer month;

    @NotNull(message = "Year is required")
    @Min(value = 2020)
    private Integer year;

    private String notes;
    private String paidAt;
}
