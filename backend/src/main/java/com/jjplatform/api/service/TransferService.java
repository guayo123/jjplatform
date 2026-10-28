package com.jjplatform.api.service;

import com.jjplatform.api.dto.TransferReviewDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Monthly fees paid by bank transfer to the academy's own account. The student (or their guardian)
 * uploads the receipt from the portal; the month stays PENDING_CONFIRMATION with method TRANSFER
 * ("in review") until staff check their bank and approve it (→ PAID) or reject it with a reason (the
 * student can then send it again or pay another way). One receipt can cover the month of several
 * profiles (a guardian's single transfer): those rows share a {@link Payment#getCheckoutGroup()} and
 * are approved or rejected together.
 */
@Service
@RequiredArgsConstructor
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    private static final String PENDING = "PENDING_CONFIRMATION";

    private final PaymentRepository paymentRepository;
    private final AcademyRepository academyRepository;
    private final PaymentService paymentService;
    private final PaymentGatewayService paymentGatewayService;
    private final PaymentNotificationService paymentNotificationService;
    private final FileStorageService fileStorageService;
    private final PushService pushService;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.base-url}")
    private String baseUrl;

    /**
     * Records a transfer receipt for the month of one or more students of the academy (ownership is
     * checked by the caller). Sending it again while in review, or after a rejection, replaces the receipt.
     */
    public void submit(List<Long> studentIds, Long academyId, int month, int year, MultipartFile file, Long payerUserId)
            throws IOException {
        if (studentIds.isEmpty()) throw new IllegalArgumentException("No hay mensualidades para pagar.");
        boolean enabled = academyRepository.findById(academyId)
                .map(a -> a.getBankDetails() != null && !a.getBankDetails().isBlank()).orElse(false);
        if (!enabled) throw new IllegalArgumentException("Tu academia no tiene habilitado el pago por transferencia.");
        boolean several = studentIds.size() > 1;

        // An unfinished Khipu checkout of the same month: confirm it if it went through after all,
        // otherwise cancel its link so the month can't be paid twice.
        transactionTemplate.executeWithoutResult(tx -> {
            for (Long studentId : studentIds) {
                paymentRepository.findByStudentIdAndMonthAndYear(studentId, month, year)
                        .ifPresent(p -> paymentGatewayService.retireOpenKhipu(p, academyId));
            }
        });

        String filename = fileStorageService.store(file, ImageValidator.Profile.RECEIPT);
        String proofUrl = baseUrl + "/api/files/" + filename;
        List<String> replacedProofs = new ArrayList<>();
        List<Long> ids;
        try {
            ids = transactionTemplate.execute(tx -> {
                List<Payment> rows = new ArrayList<>();
                for (Long studentId : studentIds) {
                    if (several && paymentRepository.findByStudentIdAndMonthAndYear(studentId, month, year)
                            .map(p -> "PAID".equals(p.getStatus())).orElse(false)) continue;
                    Payment row = paymentService.getOrCreatePendingPayment(
                            studentId, academyId, month, year, PaymentService.TRANSFER, payerUserId);
                    if (row.getProofUrl() != null) replacedProofs.add(row.getProofUrl());
                    row.setProofUrl(proofUrl);
                    // A leftover Khipu / Mercado Pago id would show up as this transfer's operation number.
                    row.setGatewayPaymentId(null);
                    rows.add(row);
                }
                if (rows.isEmpty()) throw new IllegalArgumentException("Estas mensualidades ya están pagadas.");
                if (rows.size() > 1) {
                    String group = "trf-" + java.util.UUID.randomUUID();
                    rows.forEach(r -> r.setCheckoutGroup(group));
                }
                return paymentRepository.saveAll(rows).stream().map(Payment::getId).toList();
            });
        } catch (RuntimeException e) {
            deleteQuietly(proofUrl);
            throw e;
        }
        // A replaced receipt is no longer referenced by any row (it may be shared by a group: check).
        replacedProofs.stream().distinct()
                .filter(url -> !url.equals(proofUrl) && !paymentRepository.existsByProofUrl(url))
                .forEach(this::deleteQuietly);
        paymentNotificationService.notifyTransferSubmitted(ids);
    }

    /** Receipts of the academy waiting for review, oldest first (one entry per receipt). */
    @Transactional(readOnly = true)
    public List<TransferReviewDto> pendingReviews(Long academyId) {
        Map<String, List<Payment>> byReceipt = new LinkedHashMap<>();
        paymentRepository.findByAcademyIdAndStatusAndMethodOrderByCheckoutStartedAtAsc(academyId, PENDING, PaymentService.TRANSFER)
                .stream()
                .filter(p -> PaymentService.TRANSFER_IN_REVIEW.equals(PaymentService.onlineState(p)))
                .forEach(p -> byReceipt.computeIfAbsent(
                        p.getCheckoutGroup() != null ? p.getCheckoutGroup() : "id-" + p.getId(),
                        k -> new ArrayList<>()).add(p));
        return byReceipt.values().stream().map(this::toReview).toList();
    }

    /**
     * Staff confirm the transfer arrived: every month of the receipt becomes PAID, dated when the
     * receipt was sent. For a single month staff may record a smaller amount actually received
     * (the rest stays as balance, like a partial payment).
     */
    public void approve(Long paymentId, Long academyId, BigDecimal amountReceived) {
        List<Long> ids = transactionTemplate.execute(tx -> {
            List<Payment> rows = reviewable(paymentId, academyId);
            if (amountReceived != null) {
                if (rows.size() > 1) {
                    throw new IllegalArgumentException("Un comprobante de varias mensualidades se aprueba por el total.");
                }
                Payment row = rows.get(0);
                if (amountReceived.signum() <= 0 || amountReceived.setScale(0, RoundingMode.HALF_UP).compareTo(row.getAmount()) > 0) {
                    throw new IllegalArgumentException("El monto recibido debe ser mayor a 0 y no superar " + row.getAmount().setScale(0, RoundingMode.HALF_UP) + ".");
                }
                row.setAmount(amountReceived);
            }
            for (Payment row : rows) {
                row.setStatus("PAID");
                row.setGatewayStatus(null);
                row.setReviewNote(null);
                row.setPaidAt(row.getCheckoutStartedAt() != null ? row.getCheckoutStartedAt() : LocalDateTime.now());
            }
            paymentRepository.saveAll(rows);
            return rows.stream().map(Payment::getId).toList();
        });
        paymentNotificationService.notifyTransferApproved(ids);
        pushStudents(ids, "Pago aprobado", "Tu academia confirmó tu transferencia. ¡Mensualidad al día!");
    }

    /** Staff could not find the transfer (or the receipt is wrong): the student sees why and can retry. */
    public void reject(Long paymentId, Long academyId, String reason) {
        String note = reason == null || reason.isBlank() ? null : reason.trim();
        if (note != null && note.length() > 300) note = note.substring(0, 300);
        String finalNote = note;
        List<Long> ids = transactionTemplate.execute(tx -> {
            List<Payment> rows = reviewable(paymentId, academyId);
            for (Payment row : rows) {
                row.setGatewayStatus(PaymentService.ONLINE_REJECTED);
                row.setReviewNote(finalNote);
            }
            paymentRepository.saveAll(rows);
            return rows.stream().map(Payment::getId).toList();
        });
        paymentNotificationService.notifyTransferRejected(ids, finalNote);
        pushStudents(ids, "Revisa tu comprobante",
                finalNote != null ? "Tu academia no pudo validar tu transferencia: " + finalNote
                        : "Tu academia no pudo validar tu transferencia. Revisa la sección Pagos.");
    }

    /** The receipt's rows (the payment plus its group), all of this academy and still in review. */
    private List<Payment> reviewable(Long paymentId, Long academyId) {
        Payment payment = paymentRepository.findById(paymentId)
                .filter(p -> p.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado"));
        List<Payment> rows = payment.getCheckoutGroup() != null
                ? paymentRepository.findByCheckoutGroupOrderByIdAsc(payment.getCheckoutGroup())
                : List.of(payment);
        rows = rows.stream().filter(p -> PaymentService.TRANSFER_IN_REVIEW.equals(PaymentService.onlineState(p))).toList();
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Este comprobante ya fue revisado o el alumno pagó por otro medio.");
        }
        return rows;
    }

    private TransferReviewDto toReview(List<Payment> rows) {
        Payment lead = rows.get(0);
        TransferReviewDto dto = new TransferReviewDto();
        dto.setPaymentId(lead.getId());
        dto.setProofUrl(lead.getProofUrl());
        dto.setSubmittedAt(lead.getCheckoutStartedAt() != null ? lead.getCheckoutStartedAt().toString() : null);
        User payer = lead.getPaidBy();
        if (payer != null) {
            User owner = lead.getStudent().getUser();
            dto.setPayerEmail(payer.getEmail());
            dto.setPayerGuardian(owner == null || !owner.getId().equals(payer.getId()));
        }
        List<TransferReviewDto.Item> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Payment p : rows) {
            TransferReviewDto.Item item = new TransferReviewDto.Item();
            item.setPaymentId(p.getId());
            item.setStudentId(p.getStudent().getId());
            item.setStudentName(p.getStudent().getName());
            item.setMonth(p.getMonth());
            item.setYear(p.getYear());
            item.setAmount(p.getAmount());
            items.add(item);
            total = total.add(p.getAmount());
        }
        dto.setItems(items);
        dto.setTotal(total);
        return dto;
    }

    private void pushStudents(List<Long> paymentIds, String title, String body) {
        try {
            List<Long> studentIds = paymentRepository.findAllById(paymentIds).stream()
                    .map(p -> p.getStudent().getId()).distinct().toList();
            pushService.sendToStudents(studentIds, title, body);
        } catch (RuntimeException e) {
            log.warn("Could not push transfer review result for payments {}: {}", paymentIds, e.getMessage());
        }
    }

    private void deleteQuietly(String url) {
        if (url == null || !url.contains("/api/files/")) return;
        try {
            fileStorageService.delete(url.substring(url.lastIndexOf('/') + 1));
        } catch (IOException | IllegalArgumentException e) {
            log.info("Could not delete transfer receipt {}: {}", url, e.getMessage());
        }
    }
}
