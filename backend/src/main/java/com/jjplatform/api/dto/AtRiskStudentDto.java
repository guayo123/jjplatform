package com.jjplatform.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A student flagged as at risk of churn: inactive (not training) and/or with an unpaid month. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtRiskStudentDto {
    private Long studentId;
    private String name;
    private String phone;
    private String photoUrl;
    private String lastSessionDate;       // ISO date, or null if never trained
    private Integer daysSinceLastSession; // null if never trained
    private boolean inactive;
    private boolean overduePayment;
}
