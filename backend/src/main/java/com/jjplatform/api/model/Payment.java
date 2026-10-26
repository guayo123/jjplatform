package com.jjplatform.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "month", "year"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academy_id", nullable = false)
    private Academy academy;

    @Column(precision = 10, scale = 2)
    private BigDecimal expectedAmount;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    private String discountType;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Integer year;

    private String notes;

    /**
     * PAID = confirmed (manual entry, approved transfer or paid via Mercado Pago).
     * PENDING_CONFIRMATION = student declared a transfer, awaiting staff approval.
     * Column default 'PAID' so every pre-existing row stays paid when the column is added.
     */
    @Builder.Default
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'PAID'")
    private String status = "PAID";

    /** How the payment was made: MANUAL (staff), TRANSFER, MERCADO_PAGO. */
    @Column(length = 30)
    private String method;

    /** Uploaded transfer receipt (comprobante) URL, when method = TRANSFER. */
    @Column(length = 500)
    private String proofUrl;

    /** Gateway payment/transaction id (Khipu or Mercado Pago) for reconciliation/idempotency. */
    @Column(length = 100)
    private String gatewayPaymentId;

    /** When the latest online checkout attempt started; drives the "not completed" timeout. */
    private LocalDateTime checkoutStartedAt;

    /** REJECTED when the gateway reported the latest attempt as rejected/cancelled; null otherwise. */
    @Column(length = 20)
    private String gatewayStatus;

    /** Gateway payment id we already alerted staff about as a double payment (dedupes repeated webhooks). */
    @Column(length = 100)
    private String duplicateAlertGatewayId;

    /**
     * Portal account that started the online checkout: the student themself or a guardian (apoderado).
     * Null for payments recorded by staff.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by_user_id")
    private User paidBy;

    /** Set on creation; refreshed when an online checkout is confirmed (the row exists earlier as pending). */
    @CreationTimestamp
    private LocalDateTime paidAt;
}
