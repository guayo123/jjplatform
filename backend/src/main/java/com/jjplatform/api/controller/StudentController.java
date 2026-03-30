package com.jjplatform.api.controller;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO')")
    public ResponseEntity<StudentDto> create(@Valid @RequestBody StudentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        StudentDto created = studentService.createStudent(dto, academyId);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO')")
    public ResponseEntity<StudentDto> update(@PathVariable Long id,
                                              @Valid @RequestBody StudentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(studentService.updateStudent(id, dto, academyId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENCARGADO')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        studentService.deleteStudent(id, academyId);
        return ResponseEntity.noContent().build();
    }
}
