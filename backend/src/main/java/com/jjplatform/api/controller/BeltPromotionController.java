package com.jjplatform.api.controller;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.service.BeltPromotionService;
import com.jjplatform.api.service.SecurityHelper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/belt-promotions")
@RequiredArgsConstructor
public class BeltPromotionController {

    private final BeltPromotionService beltPromotionService;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<List<BeltPromotionDto>> getByStudent(@RequestParam Long studentId) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(beltPromotionService.getByStudent(studentId, academyId));
    }

    @PostMapping
    public ResponseEntity<BeltPromotionDto> create(@Valid @RequestBody BeltPromotionDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.status(201).body(beltPromotionService.create(dto, academyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        beltPromotionService.delete(id, academyId);
        return ResponseEntity.noContent().build();
    }
}
