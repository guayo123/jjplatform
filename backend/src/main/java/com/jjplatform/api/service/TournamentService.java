package com.jjplatform.api.service;

import com.jjplatform.api.dto.TournamentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.*;
import com.jjplatform.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TournamentService {

    private final TournamentRepository tournamentRepository;
    private final TournamentParticipantRepository participantRepository;
    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;
    private final BracketService bracketService;

    public List<TournamentDto> getTournaments(Long academyId) {
        return tournamentRepository.findByAcademyIdOrderByDateDesc(academyId).stream()
                .map(this::toDto)
                .toList();
    }

    public TournamentDto getTournament(Long id, Long academyId) {
        Tournament tournament = findByIdAndAcademy(id, academyId);
        return toDto(tournament);
    }

    @Transactional
    public TournamentDto createTournament(TournamentDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Tournament tournament = Tournament.builder()
                .academy(academy)
                .name(dto.getName())
                .description(dto.getDescription())
                .date(dto.getDate())
                .maxParticipants(dto.getMaxParticipants())
                .build();

        tournament = tournamentRepository.save(tournament);
        return toDto(tournament);
    }

    @Transactional
    public TournamentDto addParticipant(Long tournamentId, Long studentId, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);

        if (tournament.getStatus() != Tournament.TournamentStatus.OPEN) {
            throw new IllegalStateException("Cannot add participants to a tournament that is not open");
        }

        if (participantRepository.existsByTournamentIdAndStudentId(tournamentId, studentId)) {
            throw new IllegalArgumentException("Student is already registered in this tournament");
        }

        if (tournament.getMaxParticipants() != null &&
                tournament.getParticipants().size() >= tournament.getMaxParticipants()) {
            throw new IllegalStateException("Tournament has reached maximum participants");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (!student.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Student does not belong to this academy");
        }

        TournamentParticipant participant = TournamentParticipant.builder()
                .tournament(tournament)
                .student(student)
                .seed(tournament.getParticipants().size() + 1)
                .build();

        participantRepository.save(participant);

        return toDto(tournamentRepository.findById(tournamentId).orElseThrow());
    }

    @Transactional
    public TournamentDto generateBracket(Long tournamentId, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);

        if (tournament.getParticipants().size() < 2) {
            throw new IllegalStateException("Need at least 2 participants to generate a bracket");
        }

        bracketService.generateBracket(tournament);

        tournament.setStatus(Tournament.TournamentStatus.IN_PROGRESS);
        tournamentRepository.save(tournament);

        return toDto(tournamentRepository.findById(tournamentId).orElseThrow());
    }

    @Transactional
    public TournamentDto recordMatchResult(Long tournamentId, Long matchId,
                                            Long winnerId, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);
        bracketService.recordResult(tournament, matchId, winnerId);
        return toDto(tournamentRepository.findById(tournamentId).orElseThrow());
    }

    private Tournament findByIdAndAcademy(Long id, Long academyId) {
        Tournament tournament = tournamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournament not found"));
        if (!tournament.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Tournament not found in this academy");
        }
        return tournament;
    }

    private TournamentDto toDto(Tournament t) {
        TournamentDto dto = new TournamentDto();
        dto.setId(t.getId());
        dto.setName(t.getName());
        dto.setDescription(t.getDescription());
        dto.setDate(t.getDate());
        dto.setMaxParticipants(t.getMaxParticipants());
        dto.setStatus(t.getStatus().name());

        dto.setParticipants(t.getParticipants().stream().map(p -> {
            TournamentDto.ParticipantDto pd = new TournamentDto.ParticipantDto();
            pd.setId(p.getId());
            pd.setStudentId(p.getStudent().getId());
            pd.setStudentName(p.getStudent().getName());
            pd.setSeed(p.getSeed());
            return pd;
        }).toList());

        dto.setMatches(t.getMatches().stream().map(m -> {
            TournamentDto.BracketMatchDto md = new TournamentDto.BracketMatchDto();
            md.setId(m.getId());
            md.setRound(m.getRound());
            md.setMatchNumber(m.getMatchNumber());
            if (m.getParticipant1() != null) {
                TournamentDto.ParticipantDto p1 = new TournamentDto.ParticipantDto();
                p1.setId(m.getParticipant1().getId());
                p1.setStudentName(m.getParticipant1().getStudent().getName());
                md.setParticipant1(p1);
            }
            if (m.getParticipant2() != null) {
                TournamentDto.ParticipantDto p2 = new TournamentDto.ParticipantDto();
                p2.setId(m.getParticipant2().getId());
                p2.setStudentName(m.getParticipant2().getStudent().getName());
                md.setParticipant2(p2);
            }
            md.setWinnerId(m.getWinner() != null ? m.getWinner().getId() : null);
            return md;
        }).toList());

        return dto;
    }
}
