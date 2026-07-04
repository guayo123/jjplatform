package com.jjplatform.api.controller;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<List<StudentDto>> list() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(studentService.getStudentsByAcademy(academyId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentDto> get(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(studentService.getStudent(id, academyId));
    }

    @PostMapping
    public ResponseEntity<StudentDto> create(@Valid @RequestBody StudentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        StudentDto created = studentService.createStudent(dto, academyId);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentDto> update(@PathVariable Long id,
                                              @Valid @RequestBody StudentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(studentService.updateStudent(id, dto, academyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        studentService.deleteStudent(id, academyId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Grant or revoke the student's Pro (premium) access. {@code months > 0} extends it by that many
     * months (from today or the current expiry, whichever is later); {@code months <= 0} revokes it.
     * Manual activation while there's no online checkout; a future payment webhook reuses the same logic.
     */
    @PutMapping("/{id}/premium")
    public ResponseEntity<StudentDto> setPremium(@PathVariable Long id,
                                                 @RequestBody java.util.Map<String, Integer> body) {
        Long academyId = securityHelper.getCurrentAcademyId();
        int months = body.getOrDefault("months", 0);
        return ResponseEntity.ok(studentService.setPremium(id, academyId, months));
    }
}
