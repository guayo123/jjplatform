package com.jjplatform.api.controller;

import com.jjplatform.api.dto.CompetitionResultDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.StudentDisciplineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentDisciplineController {

    private final StudentDisciplineService service;
    private final SecurityHelper securityHelper;

    @GetMapping("/{studentId}/disciplines")
    public ResponseEntity<List<StudentDisciplineDto>> list(@PathVariable Long studentId) {
        return ResponseEntity.ok(service.getByStudent(studentId));
    }

    @PostMapping("/{studentId}/disciplines")
    public ResponseEntity<StudentDisciplineDto> add(@PathVariable Long studentId,
                                                     @RequestBody StudentDisciplineDto dto) {
        return ResponseEntity.status(201).body(
                service.addDiscipline(studentId, securityHelper.getCurrentAcademyId(), dto));
    }

    @PutMapping("/disciplines/{id}")
    public ResponseEntity<StudentDisciplineDto> update(@PathVariable Long id,
                                                        @RequestBody StudentDisciplineDto dto) {
        return ResponseEntity.ok(service.update(id, securityHelper.getCurrentAcademyId(), dto));
    }

    @PutMapping("/disciplines/{id}/belt")
    public ResponseEntity<StudentDisciplineDto> updateBelt(@PathVariable Long id,
                                                            @RequestBody BeltUpdateRequest req) {
        return ResponseEntity.ok(service.updateBelt(id, securityHelper.getCurrentAcademyId(), req.belt(), req.stripes()));
    }

    @DeleteMapping("/disciplines/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id, securityHelper.getCurrentAcademyId());
        return ResponseEntity.noContent().build();
    }

    record BeltUpdateRequest(String belt, Integer stripes) {}

    // ── Competition Results ───────────────────────────────────────────────────

    @PostMapping("/disciplines/{studentDisciplineId}/results")
    public ResponseEntity<CompetitionResultDto> addResult(@PathVariable Long studentDisciplineId,
                                                           @RequestBody CompetitionResultDto dto) {
        return ResponseEntity.status(201).body(
                service.addResult(studentDisciplineId, securityHelper.getCurrentAcademyId(), dto));
    }

    @PutMapping("/disciplines/results/{resultId}")
    public ResponseEntity<CompetitionResultDto> updateResult(@PathVariable Long resultId,
                                                              @RequestBody CompetitionResultDto dto) {
        return ResponseEntity.ok(service.updateResult(resultId, securityHelper.getCurrentAcademyId(), dto));
    }

    @DeleteMapping("/disciplines/results/{resultId}")
    public ResponseEntity<Void> deleteResult(@PathVariable Long resultId) {
        service.deleteResult(resultId, securityHelper.getCurrentAcademyId());
        return ResponseEntity.noContent().build();
    }
}
