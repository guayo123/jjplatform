package com.jjplatform.api.service;

import com.jjplatform.api.dto.TournamentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.*;
import com.jjplatform.api.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

    @PersistenceContext
    private EntityManager entityManager;

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
    public TournamentDto repairByes(Long id, Long academyId) {
        Tournament tournament = findByIdAndAcademy(id, academyId);
        bracketService.repairByeAdvances(tournament);
        return toDto(findByIdAndAcademy(id, academyId));
    }

    @Transactional
    public TournamentDto createTournament(TournamentDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Tournament.TournamentTipo tipo = dto.getTipo() != null
                ? Tournament.TournamentTipo.valueOf(dto.getTipo())
                : Tournament.TournamentTipo.CATEGORIAS;

        Tournament tournament = Tournament.builder()
                .academy(academy)
                .name(dto.getName())
                .description(dto.getDescription())
                .date(dto.getDate())
                .maxParticipants(dto.getMaxParticipants())
                .tipo(tipo)
                .cinturonesFiltro(tipo == Tournament.TournamentTipo.ABSOLUTO ? null : dto.getCinturonesFiltro())
                .categoriasPesoFiltro(tipo == Tournament.TournamentTipo.ABSOLUTO ? null : dto.getCategoriasPesoFiltro())
                .categoriaEdadFiltro(tipo == Tournament.TournamentTipo.ABSOLUTO ? null : dto.getCategoriaEdadFiltro())
                .build();

        tournament = tournamentRepository.save(tournament);
        return toDto(tournament);
    }

    @Transactional
    public TournamentDto addParticipant(Long tournamentId, Long studentId, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);
        registerStudent(tournament, studentId, academyId);
        entityManager.flush();
        entityManager.refresh(tournament);
        return toDto(tournament);
    }

    /**
     * Inscribe a varios alumnos de una vez. Todo o nada: si no caben todos en el cupo máximo no se
     * inscribe ninguno. Los que ya estaban inscritos se ignoran.
     */
    @Transactional
    public TournamentDto addParticipants(Long tournamentId, List<Long> studentIds, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);

        if (tournament.getStatus() != Tournament.TournamentStatus.OPEN) {
            throw new IllegalStateException("Cannot add participants to a tournament that is not open");
        }

        java.util.Set<Long> alreadyIn = new java.util.HashSet<>();
        tournament.getParticipants().forEach(p -> alreadyIn.add(p.getStudent().getId()));
        List<Long> toAdd = studentIds.stream().distinct().filter(id -> !alreadyIn.contains(id)).toList();

        if (tournament.getMaxParticipants() != null
                && tournament.getParticipants().size() + toAdd.size() > tournament.getMaxParticipants()) {
            int left = Math.max(0, tournament.getMaxParticipants() - tournament.getParticipants().size());
            throw new IllegalStateException(
                    "Solo quedan " + left + " cupo" + (left == 1 ? "" : "s") + " y seleccionaste " + toAdd.size());
        }

        for (Long studentId : toAdd) {
            registerStudent(tournament, studentId, academyId);
        }
        entityManager.flush();
        entityManager.refresh(tournament);
        return toDto(tournament);
    }

    private void registerStudent(Tournament tournament, Long studentId, Long academyId) {
        if (tournament.getStatus() != Tournament.TournamentStatus.OPEN) {
            throw new IllegalStateException("Cannot add participants to a tournament that is not open");
        }

        if (participantRepository.existsByTournamentIdAndStudentId(tournament.getId(), studentId)) {
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

        // Sin restricciones de inscripción: cualquier alumno activo puede participar

        TournamentParticipant participant = TournamentParticipant.builder()
                .tournament(tournament)
                .student(student)
                .seed(tournament.getParticipants().size() + 1)
                .ageCategory(calculateAgeCategory(student.getAge()))
                .weightCategory(calculateWeightCategory(student.getWeight()))
                .build();

        participantRepository.save(participant);
        // Se agrega a la colección en memoria para que el cupo y el `seed` de los siguientes sean correctos.
        tournament.getParticipants().add(participant);
    }

    /** Asigna (o quita, con null) el número de cabeza de serie de un participante. Solo con el torneo abierto. */
    @Transactional
    public TournamentDto setSeed(Long tournamentId, Long participantId, Integer seedRank, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);

        if (tournament.getStatus() != Tournament.TournamentStatus.OPEN) {
            throw new IllegalStateException("Los cabezas de serie solo se pueden cambiar antes de generar el bracket");
        }

        TournamentParticipant participant = tournament.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found in this tournament"));

        if (seedRank != null) {
            if (seedRank < 1 || seedRank > tournament.getParticipants().size()) {
                throw new IllegalArgumentException(
                        "El cabeza de serie debe estar entre 1 y " + tournament.getParticipants().size());
            }
            boolean taken = tournament.getParticipants().stream()
                    .anyMatch(p -> !p.getId().equals(participantId) && seedRank.equals(p.getSeedRank()));
            if (taken) {
                throw new IllegalArgumentException("Ya hay otro participante como cabeza de serie " + seedRank);
            }
        }

        participant.setSeedRank(seedRank);
        participantRepository.save(participant);
        entityManager.flush();
        entityManager.refresh(tournament);
        return toDto(tournament);
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

        // BracketService borra y re-crea los combates por repositorio, así que la colección `matches`
        // del torneo en memoria quedó vacía: se recarga para devolver el bracket recién generado.
        entityManager.flush();
        entityManager.refresh(tournament);
        return toDto(tournament);
    }

    @Transactional
    public TournamentDto recordMatchResult(Long tournamentId, Long matchId,
                                            Long winnerId, String resultType, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);
        bracketService.recordResult(tournament, matchId, winnerId, resultType);

        // Verificar si el torneo ha finalizado
        tournament = tournamentRepository.findById(tournamentId).orElseThrow();
        if (bracketService.isComplete(tournament.getMatches())) {
            tournament.setStatus(Tournament.TournamentStatus.COMPLETED);
            tournamentRepository.save(tournament);
        }

        return toDto(tournamentRepository.findById(tournamentId).orElseThrow());
    }

    @Transactional
    public TournamentDto removeParticipant(Long tournamentId, Long participantId, Long academyId) {
        Tournament tournament = findByIdAndAcademy(tournamentId, academyId);

        if (tournament.getStatus() != Tournament.TournamentStatus.OPEN) {
            throw new IllegalStateException("No se pueden quitar participantes de un torneo que ya está en curso");
        }

        TournamentParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (!participant.getTournament().getId().equals(tournamentId)) {
            throw new ResourceNotFoundException("Participant not found in this tournament");
        }

        participantRepository.delete(participant);
        entityManager.flush();
        entityManager.refresh(tournament);
        return toDto(tournament);
    }

    private Tournament findByIdAndAcademy(Long id, Long academyId) {
        Tournament tournament = tournamentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournament not found"));
        if (!tournament.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Tournament not found in this academy");
        }
        return tournament;
    }

    private String calculateAgeCategory(Integer age) {
        if (age == null) return null;
        if (age <= 6)  return "Pre-Mirim";
        if (age <= 9)  return "Mirim";
        if (age <= 12) return "Infantil";
        if (age <= 15) return "Infanto-Juvenil";
        if (age <= 17) return "Juvenil";
        if (age <= 29) return "Adulto";
        if (age <= 35) return "Master 1";
        if (age <= 40) return "Master 2";
        if (age <= 45) return "Master 3";
        if (age <= 50) return "Master 4";
        if (age <= 55) return "Master 5";
        if (age <= 60) return "Master 6";
        return "Master 7";
    }

    private String calculateWeightCategory(Double weight) {
        if (weight == null) return null;
        if (weight <= 57.5)  return "Galo";
        if (weight <= 64.0)  return "Pena";
        if (weight <= 70.0)  return "Leve";
        if (weight <= 76.0)  return "Médio";
        if (weight <= 82.3)  return "Meio Pesado";
        if (weight <= 88.3)  return "Pesado";
        if (weight <= 94.3)  return "Super Pesado";
        if (weight <= 100.5) return "Pesadíssimo";
        return "Absoluto";
    }

    private TournamentDto toDto(Tournament t) {
        TournamentDto dto = new TournamentDto();
        dto.setId(t.getId());
        dto.setName(t.getName());
        dto.setDescription(t.getDescription());
        dto.setDate(t.getDate());
        dto.setMaxParticipants(t.getMaxParticipants());
        dto.setTipo(t.getTipo().name());
        dto.setCinturonesFiltro(t.getCinturonesFiltro());
        dto.setCategoriasPesoFiltro(t.getCategoriasPesoFiltro());
        dto.setCategoriaEdadFiltro(t.getCategoriaEdadFiltro());
        dto.setStatus(t.getStatus().name());

        dto.setParticipants(t.getParticipants().stream().map(p -> {
            TournamentDto.ParticipantDto pd = new TournamentDto.ParticipantDto();
            pd.setId(p.getId());
            pd.setStudentId(p.getStudent().getId());
            pd.setStudentName(p.getStudent().getName());
            pd.setSeed(p.getSeed());
            pd.setSeedRank(p.getSeedRank());
            pd.setBelt(p.getStudent().getBelt());
            pd.setAgeCategory(p.getAgeCategory());
            pd.setWeightCategory(p.getWeightCategory());
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
                p1.setSeedRank(m.getParticipant1().getSeedRank());
                md.setParticipant1(p1);
            }
            if (m.getParticipant2() != null) {
                TournamentDto.ParticipantDto p2 = new TournamentDto.ParticipantDto();
                p2.setId(m.getParticipant2().getId());
                p2.setStudentName(m.getParticipant2().getStudent().getName());
                p2.setSeedRank(m.getParticipant2().getSeedRank());
                md.setParticipant2(p2);
            }
            md.setWinnerId(m.getWinner() != null ? m.getWinner().getId() : null);
            md.setResultType(m.getResultType() != null ? m.getResultType().name() : null);
            md.setCategoryGroup(m.getCategoryGroup());
            return md;
        }).toList());

        // Campeón solo para ABSOLUTO (llave única)
        if (t.getStatus() == Tournament.TournamentStatus.COMPLETED
                && t.getTipo() == Tournament.TournamentTipo.ABSOLUTO
                && !t.getMatches().isEmpty()) {
            int maxRound = t.getMatches().stream().mapToInt(m -> m.getRound()).max().orElse(0);
            t.getMatches().stream()
                    .filter(m -> m.getRound() == maxRound && m.getWinner() != null)
                    .findFirst()
                    .ifPresent(finalMatch -> {
                        dto.setChampionStudentId(finalMatch.getWinner().getStudent().getId());
                        dto.setChampionName(finalMatch.getWinner().getStudent().getName());
                    });
        }

        return dto;
    }
}
