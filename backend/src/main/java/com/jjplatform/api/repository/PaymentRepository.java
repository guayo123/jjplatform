package com.jjplatform.api.repository;

import com.jjplatform.api.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByAcademyIdAndMonthAndYear(Long academyId, Integer month, Integer year);
    List<Payment> findByAcademyIdAndYear(Long academyId, Integer year);
    List<Payment> findByStudentIdOrderByYearDescMonthDesc(Long studentId);
    boolean existsByStudentIdAndMonthAndYear(Long studentId, Integer month, Integer year);
    Optional<Payment> findByStudentIdAndMonthAndYear(Long studentId, Integer month, Integer year);
    List<Payment> findByAcademyIdAndStatusOrderByYearDescMonthDesc(Long academyId, String status);

    /**
     * Flips a payment to PAID only if it isn't already. Returns 1 for the caller that made the
     * transition, 0 otherwise, so a webhook racing the portal's reconciliation notifies only once.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Payment p SET p.status = 'PAID', p.method = :method, p.gatewayPaymentId = :gatewayId, p.paidAt = :paidAt, "
            + "p.gatewayStatus = null WHERE p.id = :id AND p.status <> 'PAID'")
    int markPaidIfPending(@Param("id") Long id, @Param("method") String method,
                          @Param("gatewayId") String gatewayId, @Param("paidAt") LocalDateTime paidAt);

    /** Records that staff were alerted about this gateway payment; returns 1 only the first time per id. */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Payment p SET p.duplicateAlertGatewayId = :gatewayId WHERE p.id = :id "
            + "AND (p.duplicateAlertGatewayId IS NULL OR p.duplicateAlertGatewayId <> :gatewayId)")
    int claimDuplicateAlert(@Param("id") Long id, @Param("gatewayId") String gatewayId);
}
