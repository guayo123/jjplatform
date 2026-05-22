package com.jjplatform.api.controller;

import com.jjplatform.api.dto.DisciplineAgeCategoryDto;
import com.jjplatform.api.service.DisciplineBeltService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disciplines")
@RequiredArgsConstructor
public class DisciplineBeltController {

    private final DisciplineBeltService service;

    @GetMapping("/{disciplineId}/categories")
    public ResponseEntity<List<DisciplineAgeCategoryDto>> getCategories(@PathVariable Long disciplineId) {
        return ResponseEntity.ok(service.getCategories(disciplineId));
    }

    @PostMapping("/{disciplineId}/categories")
    public ResponseEntity<DisciplineAgeCategoryDto> createCategory(
            @PathVariable Long disciplineId,
            @RequestBody DisciplineBeltService.CategoryRequest req) {
        return ResponseEntity.ok(service.createCategory(disciplineId, req));
    }

    @PutMapping("/categories/{catId}")
    public ResponseEntity<DisciplineAgeCategoryDto> updateCategory(
            @PathVariable Long catId,
            @RequestBody DisciplineBeltService.CategoryRequest req) {
        return ResponseEntity.ok(service.updateCategory(catId, req));
    }

    @DeleteMapping("/categories/{catId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long catId) {
        service.deleteCategory(catId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/categories/{catId}/belts")
    public ResponseEntity<DisciplineAgeCategoryDto> addBelt(
            @PathVariable Long catId,
            @RequestBody DisciplineBeltService.BeltRequest req) {
        return ResponseEntity.ok(service.addBelt(catId, req));
    }

    @PutMapping("/belts/{beltId}")
    public ResponseEntity<DisciplineAgeCategoryDto> updateBelt(
            @PathVariable Long beltId,
            @RequestBody DisciplineBeltService.BeltRequest req) {
        return ResponseEntity.ok(service.updateBelt(beltId, req));
    }

    @DeleteMapping("/belts/{beltId}")
    public ResponseEntity<Void> deleteBelt(@PathVariable Long beltId) {
        service.deleteBelt(beltId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/categories/{catId}/belts/reorder")
    public ResponseEntity<DisciplineAgeCategoryDto> reorderBelts(
            @PathVariable Long catId,
            @RequestBody List<Long> orderedIds) {
        return ResponseEntity.ok(service.reorderBelts(catId, orderedIds));
    }
}
