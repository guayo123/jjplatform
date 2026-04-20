package com.jjplatform.api.controller;

import com.jjplatform.api.dto.TournamentDto;
import com.jjplatform.api.service.SecurityHelper;
import com.jjplatform.api.service.TournamentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<List<TournamentDto>> list() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(tournamentService.getTournaments(academyId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TournamentDto> get(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(tournamentService.getTournament(id, academyId));
    }

    @PostMapping
    public ResponseEntity<TournamentDto> create(@Valid @RequestBody TournamentDto dto) {
        Long academyId = securityHelper.getCurrentAcademyId();
        TournamentDto created = tournamentService.createTournament(dto, academyId);
        return ResponseEntity.status(201).body(created);
    }

    @PostMapping("/{id}/participants")
    public ResponseEntity<TournamentDto> addParticipant(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Long studentId = body.get("studentId");
        return ResponseEntity.ok(tournamentService.addParticipant(id, studentId, academyId));
    }

    @PostMapping("/{id}/generate-bracket")
    public ResponseEntity<TournamentDto> generateBracket(@PathVariable Long id) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(tournamentService.generateBracket(id, academyId));
    }

    @PutMapping("/{id}/matches/{matchId}")
    public ResponseEntity<TournamentDto> recordResult(
            @PathVariable Long id,
            @PathVariable Long matchId,
            @RequestBody Map<String, Object> body) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Long winnerId = ((Number) body.get("winnerId")).longValue();
        String resultType = (String) body.get("resultType");
        return ResponseEntity.ok(
                tournamentService.recordMatchResult(id, matchId, winnerId, resultType, academyId));
    }

    @DeleteMapping("/{id}/participants/{participantId}")
    public ResponseEntity<TournamentDto> removeParticipant(
            @PathVariable Long id,
            @PathVariable Long participantId) {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(tournamentService.removeParticipant(id, participantId, academyId));
    }
}
