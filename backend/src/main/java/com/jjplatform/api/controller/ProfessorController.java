package com.jjplatform.api.controller;

import com.jjplatform.api.dto.ProfessorDto;
import com.jjplatform.api.service.ProfessorService;
import com.jjplatform.api.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/professors")
@RequiredArgsConstructor
public class ProfessorController {

    private final ProfessorService professorService;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<List<ProfessorDto>> list() {
        return ResponseEntity.ok(professorService.getByAcademy(securityHelper.getCurrentAcademyId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfessorDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(professorService.getOne(id, securityHelper.getCurrentAcademyId()));
    }

    @PostMapping
    public ResponseEntity<ProfessorDto> create(@Valid @RequestBody ProfessorDto dto) {
        return ResponseEntity.status(201).body(professorService.create(dto, securityHelper.getCurrentAcademyId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfessorDto> update(@PathVariable Long id, @Valid @RequestBody ProfessorDto dto) {
        return ResponseEntity.ok(professorService.update(id, dto, securityHelper.getCurrentAcademyId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        professorService.delete(id, securityHelper.getCurrentAcademyId());
        return ResponseEntity.noContent().build();
    }
}
