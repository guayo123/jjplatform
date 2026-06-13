package com.jjplatform.api.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Fires the daily payment-reminder sweep. Each academy opts in via paymentRemindersEnabled. */
@Component
@RequiredArgsConstructor
public class PaymentReminderJob {

    private static final Logger log = LoggerFactory.getLogger(PaymentReminderJob.class);

    private final RetentionService retentionService;

    /** Every day at 10:00 (server time). */
    @Scheduled(cron = "0 0 10 * * *")
    public void sendReminders() {
        try {
            retentionService.sendDueReminders();
        } catch (Exception e) {
            log.warn("Payment reminder sweep failed: {}", e.getMessage());
        }
    }
}
