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

    /** PAID | PENDING_CONFIRMATION */
    private String status;
    /** null (recorded by staff) | TRANSFER | KHIPU | MERCADO_PAGO */
    private String method;
    private String proofUrl;

    /** Account that paid online (null for staff-recorded payments) and whether it was a guardian. */
    private String paidByEmail;
    private Boolean paidByGuardian;

    /**
     * Pending state: IN_PROGRESS | EXPIRED | REJECTED for an online checkout, IN_REVIEW | REJECTED for
     * a transfer receipt (null when the payment isn't pending).
     */
    private String onlineState;

    /** Why staff rejected the transfer receipt (null unless rejected). */
    private String reviewNote;

    /** Gateway operation id of a confirmed online payment (Khipu / Mercado Pago), for the receipt. */
    private String operationId;

    /**
     * When this month was paid together with others in one checkout (a guardian's "pagar todo"):
     * every month of that payment and the total charged, so the receipt shows the whole transfer.
     * Null for a payment of a single month.
     */
    private java.util.List<GroupItem> groupItems;
    private BigDecimal groupTotal;

    @Data
    public static class GroupItem {
        private Long studentId;
        private String studentName;
        private BigDecimal amount;
        /** Amount taken off by the student's discount (null when none) and its reason. */
        private BigDecimal discountValue;
        private String discountReason;
    }
}
