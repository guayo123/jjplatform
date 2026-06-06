package com.jjplatform.api.controller;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.service.PortalService;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Self-service portal for the STUDENT role. A student can only read their own record(s) and edit their
 * own profile photo; access is restricted to STUDENT in SecurityConfig and every record is resolved from
 * the logged-in user / verified against it, never trusted from a client-supplied id alone.
 */
@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class PortalController {

    private final StudentService studentService;
    private final PortalService portalService;
    private final SecurityHelper securityHelper;

    /** Returns the logged-in student's profile(s) — one per academy they belong to. */
    @GetMapping("/me")
    public ResponseEntity<List<StudentDto>> me() {
        Long userId = securityHelper.getCurrentUser().getId();
        return ResponseEntity.ok(studentService.getMyStudents(userId));
    }

    @GetMapping("/students/{studentId}/disciplines")
    public ResponseEntity<List<StudentDisciplineDto>> disciplines(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getDisciplines(studentId));
    }

    @GetMapping("/students/{studentId}/belt-promotions")
    public ResponseEntity<List<BeltPromotionDto>> beltPromotions(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getBeltPromotions(studentId));
    }

    @GetMapping("/students/{studentId}/payments")
    public ResponseEntity<List<PaymentDto>> payments(@PathVariable Long studentId) {
        return ResponseEntity.ok(portalService.getPayments(studentId));
    }

    @PostMapping("/students/{studentId}/photo")
    public ResponseEntity<Map<String, String>> updatePhoto(@PathVariable Long studentId,
                                                            @RequestParam("file") MultipartFile file) throws IOException {
        String url = portalService.updatePhoto(studentId, file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /** Portal cover/banner preference (per logged-in student). */
    @GetMapping("/banner")
    public ResponseEntity<Map<String, String>> getBanner() {
        Map<String, String> body = new HashMap<>();
        body.put("banner", portalService.getBanner());
        return ResponseEntity.ok(body);
    }

    @PutMapping("/banner")
    public ResponseEntity<Map<String, String>> setBanner(@RequestBody Map<String, String> request) {
        Map<String, String> body = new HashMap<>();
        body.put("banner", portalService.setBanner(request.get("banner")));
        return ResponseEntity.ok(body);
    }
}
