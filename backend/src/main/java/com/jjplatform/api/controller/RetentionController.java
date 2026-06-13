package com.jjplatform.api.controller;

import com.jjplatform.api.dto.AtRiskStudentDto;
import com.jjplatform.api.service.RetentionService;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Staff-only churn-risk dashboard + manual WhatsApp reminder trigger. */
@RestController
@RequestMapping("/api/retention")
@RequiredArgsConstructor
public class RetentionController {

    private final RetentionService retentionService;
    private final SecurityHelper securityHelper;

    @GetMapping("/at-risk")
    public ResponseEntity<List<AtRiskStudentDto>> atRisk() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(retentionService.getAtRisk(academyId));
    }

    @PostMapping("/students/{studentId}/remind")
    public ResponseEntity<Void> remind(@PathVariable Long studentId) {
        Long academyId = securityHelper.getCurrentAcademyId();
        retentionService.remindStudent(studentId, academyId);
        return ResponseEntity.noContent().build();
    }
}
