package com.jjplatform.api.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Daily sweep that retires accepted bouts nobody resolved (see {@link DuelService#expireStale}). */
@Component
@RequiredArgsConstructor
public class DuelExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(DuelExpiryJob.class);

    private final DuelService duelService;

    /** Every day at 03:00 (server time) — quiet hours, no academy activity. */
    @Scheduled(cron = "0 0 3 * * *")
    public void sweep() {
        try {
            int expired = duelService.expireStale();
            if (expired > 0) log.info("DuelExpiryJob: expired {} stale accepted duel(s)", expired);
        } catch (Exception e) {
            log.warn("Duel expiry sweep failed: {}", e.getMessage());
        }
    }
}
