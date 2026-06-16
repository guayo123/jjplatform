package com.jjplatform.api.service;

import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Duel;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.DuelRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Challenges ("retos") between classmates. All actions verify the acting student is a
 * legitimate participant; the academy feed exposes only completed/rejected duels.
 */
@Service
@RequiredArgsConstructor
public class DuelService {

    private final DuelRepository duelRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public DuelDto create(Student challenger, CreateDuelRequest req) {
        if (req.getOpponentStudentId() == null) {
            throw new IllegalArgumentException("Debes elegir un rival.");
        }
        if (req.getOpponentStudentId().equals(challenger.getId())) {
            throw new IllegalArgumentException("No puedes retarte a ti mismo.");
        }
        Student opponent = studentRepository.findById(req.getOpponentStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Rival no encontrado"));
        if (opponent.getAcademy() == null || challenger.getAcademy() == null
                || !opponent.getAcademy().getId().equals(challenger.getAcademy().getId())) {
            throw new IllegalArgumentException("Solo puedes retar a compañeros de tu academia.");
        }

        Student referee = resolveReferee(req.getRefereeStudentId(), challenger, opponent);

        Duel duel = Duel.builder()
                .academy(challenger.getAcademy())
                .challenger(challenger)
                .opponent(opponent)
                .referee(referee)
                .status(Duel.Status.PENDING)
                .modality(parseModality(req.getModality()))
                .message(trim(req.getMessage()))
                .build();
        return toDto(duelRepository.save(duel));
    }

    @Transactional
    public DuelDto respond(Student me, Long duelId, boolean accept) {
        Duel duel = require(duelId);
        if (!duel.getOpponent().getId().equals(me.getId())) {
            throw new IllegalArgumentException("Solo el retado puede responder este duelo.");
        }
        if (duel.getStatus() != Duel.Status.PENDING) {
            throw new IllegalArgumentException("Este duelo ya fue respondido.");
        }
        duel.setStatus(accept ? Duel.Status.ACCEPTED : Duel.Status.REJECTED);
        duel.setRespondedAt(LocalDateTime.now());
        return toDto(duelRepository.save(duel));
    }

    @Transactional
    public DuelDto reportResult(Student me, Long duelId, DuelResultRequest req) {
        Duel duel = require(duelId);
        if (duel.getReferee() != null) {
            // Refereed duel: only the impartial judge declares the winner.
            if (!duel.getReferee().getId().equals(me.getId())) {
                throw new IllegalArgumentException("Solo el árbitro puede registrar el resultado de este duelo.");
            }
        } else if (!isParticipant(duel, me.getId())) {
            throw new IllegalArgumentException("Solo un participante puede registrar el resultado.");
        }
        if (duel.getStatus() != Duel.Status.ACCEPTED) {
            throw new IllegalArgumentException("Solo puedes registrar el resultado de un duelo aceptado.");
        }
        Duel.Method method = parseMethod(req.getMethod());

        Long winner = req.getWinnerStudentId();
        if (method == Duel.Method.DRAW) {
            winner = null;
        } else {
            if (winner == null || !isParticipant(duel, winner)) {
                throw new IllegalArgumentException("El ganador debe ser uno de los participantes.");
            }
        }

        duel.setStatus(Duel.Status.COMPLETED);
        duel.setMethod(method);
        duel.setWinnerStudentId(winner);
        duel.setSubmissionName(method == Duel.Method.SUBMISSION ? trim(req.getSubmissionName()) : null);
        duel.setResultNotes(trim(req.getNotes()));
        duel.setReportedBy(me.getId());
        duel.setCompletedAt(LocalDateTime.now());
        return toDto(duelRepository.save(duel));
    }

    @Transactional
    public void cancel(Student me, Long duelId) {
        Duel duel = require(duelId);
        if (!duel.getChallenger().getId().equals(me.getId())) {
            throw new IllegalArgumentException("Solo quien retó puede cancelar.");
        }
        if (duel.getStatus() != Duel.Status.PENDING) {
            throw new IllegalArgumentException("Solo puedes cancelar un duelo pendiente.");
        }
        duel.setStatus(Duel.Status.CANCELLED);
        duelRepository.save(duel);
    }

    @Transactional(readOnly = true)
    public List<DuelDto> listForStudent(Long studentId) {
        return duelRepository.findInvolving(studentId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<DuelDto> feed(Long academyId) {
        return duelRepository
                .findByAcademyIdAndStatusInOrderByUpdatedAtDesc(
                        academyId, List.of(Duel.Status.COMPLETED, Duel.Status.REJECTED))
                .stream().limit(40).map(this::toDto).toList();
    }

    // --- helpers ----------------------------------------------------------

    private Duel require(Long id) {
        return duelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Duelo no encontrado"));
    }

    private boolean isParticipant(Duel d, Long studentId) {
        return d.getChallenger().getId().equals(studentId) || d.getOpponent().getId().equals(studentId);
    }

    /** Validates the optional referee: a third classmate of the same academy, not a participant. */
    private Student resolveReferee(Long refereeId, Student challenger, Student opponent) {
        if (refereeId == null) return null;
        if (refereeId.equals(challenger.getId()) || refereeId.equals(opponent.getId())) {
            throw new IllegalArgumentException("El árbitro debe ser una tercera persona, no un participante.");
        }
        Student referee = studentRepository.findById(refereeId)
                .orElseThrow(() -> new ResourceNotFoundException("Árbitro no encontrado"));
        if (referee.getAcademy() == null
                || !referee.getAcademy().getId().equals(challenger.getAcademy().getId())) {
            throw new IllegalArgumentException("El árbitro debe ser de tu academia.");
        }
        return referee;
    }

    private DuelDto toDto(Duel d) {
        DuelDto dto = new DuelDto();
        dto.setId(d.getId());
        dto.setStatus(d.getStatus().name());

        Student c = d.getChallenger();
        Student o = d.getOpponent();
        dto.setChallengerId(c.getId());
        dto.setChallengerName(c.getName());
        dto.setChallengerPhotoUrl(c.getPhotoUrl());
        dto.setOpponentId(o.getId());
        dto.setOpponentName(o.getName());
        dto.setOpponentPhotoUrl(o.getPhotoUrl());

        if (d.getReferee() != null) {
            dto.setRefereeId(d.getReferee().getId());
            dto.setRefereeName(d.getReferee().getName());
        }

        dto.setModality(d.getModality());
        dto.setMessage(d.getMessage());

        dto.setWinnerStudentId(d.getWinnerStudentId());
        if (d.getWinnerStudentId() != null) {
            dto.setWinnerName(d.getWinnerStudentId().equals(c.getId()) ? c.getName() : o.getName());
        }
        dto.setMethod(d.getMethod() != null ? d.getMethod().name() : null);
        dto.setSubmissionName(d.getSubmissionName());
        dto.setResultNotes(d.getResultNotes());

        dto.setCreatedAt(d.getCreatedAt());
        dto.setRespondedAt(d.getRespondedAt());
        dto.setCompletedAt(d.getCompletedAt());
        return dto;
    }

    private String parseModality(String v) {
        if (v == null || v.isBlank()) return null;
        String up = v.trim().toUpperCase();
        if (!up.equals("GI") && !up.equals("NOGI")) {
            throw new IllegalArgumentException("Modalidad no válida (GI/NOGI).");
        }
        return up;
    }

    private Duel.Method parseMethod(String v) {
        if (v == null || v.isBlank()) {
            throw new IllegalArgumentException("Indica cómo terminó el duelo.");
        }
        try {
            return Duel.Method.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Método no válido (SUBMISSION/POINTS/DECISION/DRAW).");
        }
    }

    private String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
