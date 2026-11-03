package com.jjplatform.api.controller;

import com.jjplatform.api.dto.AttendanceDayDto;
import com.jjplatform.api.dto.AttendanceDto;
import com.jjplatform.api.service.AttendanceService;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/** Staff side of QR attendance: the academy's QR code, the day roster and manual marks. */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final SecurityHelper securityHelper;

    /** The academy's check-in code (created on first use); the QR encodes {portal}/asistencia/{code}. */
    @GetMapping("/code")
    public ResponseEntity<Map<String, String>> code() {
        return ResponseEntity.ok(Map.of("code", attendanceService.getOrCreateCode(securityHelper.getCurrentAcademyId())));
    }

    /** Issues a new code; printed QRs with the old one stop working. */
    @PostMapping("/code/regenerate")
    public ResponseEntity<Map<String, String>> regenerate() {
        return ResponseEntity.ok(Map.of("code", attendanceService.regenerateCode(securityHelper.getCurrentAcademyId())));
    }

    @GetMapping("/day")
    public ResponseEntity<AttendanceDayDto> day(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.day(securityHelper.getCurrentAcademyId(), date));
    }

    /** Manual mark. Body: {studentId, scheduleId (null = free session), date}. */
    @PostMapping
    public ResponseEntity<AttendanceDto> mark(@RequestBody Map<String, Object> body) {
        Long studentId = ((Number) body.get("studentId")).longValue();
        Long scheduleId = body.get("scheduleId") instanceof Number n ? n.longValue() : null;
        LocalDate date = LocalDate.parse(String.valueOf(body.get("date")));
        return ResponseEntity.ok(attendanceService.markManual(securityHelper.getCurrentAcademyId(), studentId, scheduleId, date));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        attendanceService.delete(securityHelper.getCurrentAcademyId(), id);
        return ResponseEntity.noContent().build();
    }

    /** A student's history: {thisMonth, last30, items}. */
    @GetMapping("/students/{studentId}")
    public ResponseEntity<Map<String, Object>> history(@PathVariable Long studentId) {
        return ResponseEntity.ok(attendanceService.history(securityHelper.getCurrentAcademyId(), studentId));
    }
}
