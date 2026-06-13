package com.jjplatform.api.controller;

import com.jjplatform.api.dto.TechniqueDto;
import com.jjplatform.api.service.TechniqueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Staff-only management of the per-belt technique curriculum. STUDENT is excluded by
 * SecurityConfig (these paths fall under the admin/staff catch-all); academy ownership of
 * the belt/technique is verified in the service.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TechniqueController {

    private final TechniqueService service;

    @GetMapping("/disciplines/belts/{beltId}/techniques")
    public ResponseEntity<List<TechniqueDto>> list(@PathVariable Long beltId) {
        return ResponseEntity.ok(service.listByBelt(beltId));
    }

    @PostMapping("/disciplines/belts/{beltId}/techniques")
    public ResponseEntity<TechniqueDto> create(@PathVariable Long beltId,
                                               @RequestBody TechniqueService.TechniqueRequest req) {
        return ResponseEntity.ok(service.create(beltId, req));
    }

    @PutMapping("/techniques/{techniqueId}")
    public ResponseEntity<TechniqueDto> update(@PathVariable Long techniqueId,
                                               @RequestBody TechniqueService.TechniqueRequest req) {
        return ResponseEntity.ok(service.update(techniqueId, req));
    }

    @DeleteMapping("/techniques/{techniqueId}")
    public ResponseEntity<Void> delete(@PathVariable Long techniqueId) {
        service.delete(techniqueId);
        return ResponseEntity.noContent().build();
    }
}
