package com.jjplatform.api.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * A transfer receipt waiting for staff review: one month, or several when a guardian sent a single
 * transfer for all their children. Approving or rejecting it acts on every month it covers.
 */
@Data
public class TransferReviewDto {
    /** Id of the first payment row; the one used to approve / reject the whole receipt. */
    private Long paymentId;
    private List<Item> items;
    private BigDecimal total;
    private String proofUrl;
    /** Portal account that sent the receipt and whether it was a guardian (not the student themself). */
    private String payerEmail;
    private Boolean payerGuardian;
    private String submittedAt;

    @Data
    public static class Item {
        private Long paymentId;
        private Long studentId;
        private String studentName;
        private Integer month;
        private Integer year;
        private BigDecimal amount;
    }
}
