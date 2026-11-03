package com.jjplatform.api.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** A student's family (guardian + the records in their charge) and what each owes for a month. */
@Data
public class FamilyDueDto {
    private String guardianName;
    private List<Member> members = new ArrayList<>();
    /** Sum of {@link Member#due} for members that can be paid now (PENDING / PARTIAL). */
    private BigDecimal totalDue = BigDecimal.ZERO;

    @Data
    public static class Member {
        private Long studentId;
        private String name;
        /** PAID, PARTIAL (abono with balance), PENDING, IN_REVIEW (transfer receipt) or NO_FEE (no priced plan). */
        private String status;
        /** Plans before the standing discount. */
        private BigDecimal planTotal;
        /** Month fee after the discount. */
        private BigDecimal net;
        private BigDecimal paid = BigDecimal.ZERO;
        /** Still owed for the month. */
        private BigDecimal due = BigDecimal.ZERO;
        private String discountReason;
        private Long paymentId;
    }
}
