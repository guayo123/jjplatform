package com.jjplatform.api.controller;

import com.jjplatform.api.service.DuelService;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Staff-only duel maintenance. Lets an admin run the stale-bout sweep on demand for their own
 * academy instead of waiting for the nightly {@link com.jjplatform.api.service.DuelExpiryJob}.
 * Protected by the catch-all staff rule in SecurityConfig (anyRequest → ADMIN/PROFESOR/ENCARGADO).
 */
@RestController
@RequestMapping("/api/duels/maintenance")
@RequiredArgsConstructor
public class DuelMaintenanceController {

    private final DuelService duelService;
    private final SecurityHelper securityHelper;

    /** Expire this academy's accepted bouts left unresolved past the stale window. */
    @PostMapping("/expire-stale")
    public ResponseEntity<Map<String, Integer>> expireStale() {
        Long academyId = securityHelper.getCurrentAcademyId();
        int expired = duelService.expireStaleForAcademy(academyId);
        return ResponseEntity.ok(Map.of("expired", expired));
    }
}
