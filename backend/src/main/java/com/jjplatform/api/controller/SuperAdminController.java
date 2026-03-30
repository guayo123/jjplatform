package com.jjplatform.api.controller;

import com.jjplatform.api.dto.AcademyAdminDto;
import com.jjplatform.api.dto.RegisterRequest;
import com.jjplatform.api.service.AuthService;
import com.jjplatform.api.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/super")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final AuthService authService;

    @GetMapping("/academies")
    public ResponseEntity<List<AcademyAdminDto>> listAcademies() {
        return ResponseEntity.ok(superAdminService.listAllAcademies());
    }

    @PostMapping("/academies")
    public ResponseEntity<AcademyAdminDto> createAcademy(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(201).body(superAdminService.createAcademy(request));
    }

    @PatchMapping("/academies/{id}/toggle-active")
    public ResponseEntity<AcademyAdminDto> toggleAcademyActive(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.toggleAcademyActive(id));
    }
}
