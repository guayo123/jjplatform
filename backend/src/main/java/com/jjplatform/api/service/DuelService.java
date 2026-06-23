package com.jjplatform.api.service;

import com.jjplatform.api.dto.CreateDuelRequest;
import com.jjplatform.api.dto.DuelDto;
import com.jjplatform.api.dto.DuelFeedPageDto;
import com.jjplatform.api.dto.DuelRankingDto;
import com.jjplatform.api.dto.DuelResultRequest;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Duel;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.DuelRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Challenges ("retos") between classmates. All actions verify the acting student is a
 * legitimate participant; the academy feed exposes only completed/rejected duels.
 */
@Service
@RequiredArgsConstructor
public class DuelService {

    private final DuelRepository duelRepository;
    private final StudentRepository studentRepository;
    private final PushService pushService;

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

        String format = parseFormat(req.getFormat());
        if (format == null) {
            throw new IllegalArgumentException("Debes elegir un modo para el duelo.");
        }
        // Gi/No-Gi only applies to a submission bout.
        String modality = "SUBMISSION".equals(format) ? parseModality(req.getModality()) : null;

        Duel duel = Duel.builder()
                .academy(challenger.getAcademy())
                .challenger(challenger)
                .opponent(opponent)
                .referee(referee)
                .status(Duel.Status.PENDING)
                .format(format)
                .modality(modality)
                .message(trim(req.getMessage()))
                .scheduledAt(req.getScheduledAt())
                .location(trim(req.getLocation()))
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
        DuelDto dto = toDto(duelRepository.save(duel));
        if (accept) {
            // Tell the whole academy the bout is on — except whoever just accepted.
            pushService.sendToAcademy(duel.getAcademy().getId(), "⚔️ Duelo confirmado",
                    duel.getChallenger().getName() + " vs " + duel.getOpponent().getName(), me.getId());
        }
        return dto;
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
        // Per-fighter score only for a points decision.
        duel.setChallengerScore(method == Duel.Method.POINTS ? clampScore(req.getChallengerScore()) : null);
        duel.setOpponentScore(method == Duel.Method.POINTS ? clampScore(req.getOpponentScore()) : null);
        duel.setResultNotes(trim(req.getNotes()));
        duel.setReportedBy(me.getId());
        duel.setCompletedAt(LocalDateTime.now());
        DuelDto dto = toDto(duelRepository.save(duel));

        // Broadcast the result to the whole academy — except whoever reported it.
        String title;
        String body;
        if (winner == null) {
            title = "🤝 Duelo en la academia";
            body = duel.getChallenger().getName() + " y " + duel.getOpponent().getName() + " terminaron en empate.";
        } else {
            Student winnerStudent = winner.equals(duel.getChallenger().getId()) ? duel.getChallenger() : duel.getOpponent();
            Student loserStudent = winner.equals(duel.getChallenger().getId()) ? duel.getOpponent() : duel.getChallenger();
            title = "🏆 ¡Victoria en la academia!";
            body = winnerStudent.getName() + " venció a " + loserStudent.getName() + ".";
        }
        pushService.sendToAcademy(duel.getAcademy().getId(), title, body, me.getId());
        return dto;
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

    /**
     * Either participant closes an accepted bout that won't be fought (chickened out / postponed),
     * freeing it from the "in play" list. The referee — who isn't a fighter — can't close it; only
     * the two involved decide the bout is off. Closed bouts don't count toward the ranking.
     */
    @Transactional
    public DuelDto closeAccepted(Student me, Long duelId, String reason) {
        Duel duel = require(duelId);
        if (!isParticipant(duel, me.getId())) {
            throw new IllegalArgumentException("Solo un participante puede cerrar el duelo.");
        }
        if (duel.getStatus() != Duel.Status.ACCEPTED) {
            throw new IllegalArgumentException("Solo puedes cerrar un duelo aceptado.");
        }
        duel.setStatus(Duel.Status.CANCELLED);
        duel.setCloseReason(parseCloseReason(reason));
        return toDto(duelRepository.save(duel));
    }

    /** Number of days an accepted bout may sit unresolved before it is expired. */
    private static final long STALE_DAYS = 5;

    /**
     * Daily sweep across all academies: retire accepted bouts nobody resolved {@value #STALE_DAYS}
     * days after their agreed date (or, when no date was set, after they were accepted). Keeps the
     * "in play" list honest when a referee never rules or fighters never report. Returns the count.
     */
    @Transactional
    public int expireStale() {
        return expire(duelRepository.findByStatus(Duel.Status.ACCEPTED));
    }

    /** Same sweep limited to one academy — backs the admin's manual "limpiar duelos vencidos". */
    @Transactional
    public int expireStaleForAcademy(Long academyId) {
        return expire(duelRepository.findByAcademyIdAndStatus(academyId, Duel.Status.ACCEPTED));
    }

    private int expire(List<Duel> accepted) {
        LocalDateTime now = LocalDateTime.now();
        int expired = 0;
        for (Duel d : accepted) {
            // Count from the agreed date, or from acceptance when no date was set.
            LocalDateTime since = d.getScheduledAt() != null ? d.getScheduledAt() : d.getRespondedAt();
            if (since == null) continue; // no reference point yet — leave it alone
            if (since.plusDays(STALE_DAYS).isBefore(now)) {
                d.setStatus(Duel.Status.EXPIRED);
                duelRepository.save(d);
                expired++;
            }
        }
        return expired;
    }

    @Transactional(readOnly = true)
    public List<DuelDto> listForStudent(Long studentId) {
        return duelRepository.findInvolving(studentId).stream().map(this::toDto).toList();
    }

    /**
     * Academy activity, newest first. Carries three groups the UI splits into tabs:
     * <ul>
     *   <li>COMPLETED + REJECTED — the visible "Resultados" tab.</li>
     *   <li>CANCELLED (closed by a fighter) + EXPIRED (retired by the sweep) — the "Sin resolver" tab.</li>
     *   <li>ACCEPTED — not shown; only the client's academy-wide "duel confirmed" notifier reads these.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public List<DuelDto> feed(Long academyId) {
        return duelRepository
                .findByAcademyIdAndStatusInOrderByUpdatedAtDesc(
                        academyId, List.of(Duel.Status.COMPLETED, Duel.Status.REJECTED, Duel.Status.ACCEPTED,
                                Duel.Status.CANCELLED, Duel.Status.EXPIRED))
                .stream().limit(60).map(this::toDto).toList();
    }

    // --- Paginated feed (keyset / cursor) ---------------------------------

    private static final int FEED_PAGE_MAX = 50;
    private static final int FEED_PAGE_DEFAULT = 20;
    /** First-page sentinel: a date no real row reaches, so the cursor predicate includes everything. */
    private static final LocalDateTime FAR_FUTURE = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    /**
     * One page of the academy feed for the given tab, newest first, via keyset pagination.
     * {@code tab} = "unresolved" returns closed/expired bouts; anything else returns the results
     * tab (completed + rejected). {@code cursor} is the opaque token from the previous page (null
     * for the first page). The returned {@code nextCursor} is null once there are no older rows.
     */
    @Transactional(readOnly = true)
    public DuelFeedPageDto feedPage(Long academyId, String tab, String cursor, int size) {
        int pageSize = Math.min(Math.max(size, 1), FEED_PAGE_MAX);
        if (size <= 0) pageSize = FEED_PAGE_DEFAULT;

        LocalDateTime cursorTime = FAR_FUTURE;
        Long cursorId = Long.MAX_VALUE;
        long[] decoded = decodeCursor(cursor);
        if (decoded != null) {
            cursorTime = LocalDateTime.ofEpochSecond(decoded[0], (int) decoded[1], java.time.ZoneOffset.UTC);
            cursorId = decoded[2];
        }

        Pageable pageable = PageRequest.of(0, pageSize,
                Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));

        List<Duel> rows = "unresolved".equalsIgnoreCase(tab)
                ? duelRepository.feedUnresolvedPage(academyId, Duel.Status.EXPIRED, Duel.Status.CANCELLED, cursorTime, cursorId, pageable)
                : duelRepository.feedResultsPage(academyId, List.of(Duel.Status.COMPLETED, Duel.Status.REJECTED), cursorTime, cursorId, pageable);

        // A full page means there may be more; encode the last row as the next cursor.
        String next = rows.size() == pageSize ? encodeCursor(rows.get(rows.size() - 1)) : null;
        return new DuelFeedPageDto(rows.stream().map(this::toDto).toList(), next);
    }

    /** Cursor = "<epochSeconds>_<nanoOfSecond>_<id>" of the last row (UTC). Full precision, index-friendly. */
    private String encodeCursor(Duel d) {
        LocalDateTime t = d.getUpdatedAt();
        long epochSecond = t.toEpochSecond(java.time.ZoneOffset.UTC);
        return epochSecond + "_" + t.getNano() + "_" + d.getId();
    }

    /** Returns {epochSecond, nanoOfSecond, id} or null when the cursor is absent/malformed. */
    private long[] decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            String[] parts = cursor.split("_");
            if (parts.length != 3) return null;
            return new long[]{ Long.parseLong(parts[0]), Long.parseLong(parts[1]), Long.parseLong(parts[2]) };
        } catch (NumberFormatException e) {
            return null; // tolerate a bad token by serving the first page
        }
    }

    /**
     * Top-10 academy duel ranking by record. Tallies wins/losses/draws per participant across all
     * COMPLETED duels, then ranks by wins (desc), fewer losses, more total bouts and finally name.
     */
    @Transactional(readOnly = true)
    public List<DuelRankingDto> ranking(Long academyId) {
        List<Duel> completed = duelRepository.findByAcademyIdAndStatusInOrderByUpdatedAtDesc(
                academyId, List.of(Duel.Status.COMPLETED));

        Map<Long, DuelRankingDto> byStudent = new LinkedHashMap<>();
        for (Duel d : completed) {
            Long winner = d.getWinnerStudentId(); // null = draw
            tally(byStudent, d.getChallenger(), winner);
            tally(byStudent, d.getOpponent(), winner);
        }

        List<DuelRankingDto> rows = new ArrayList<>(byStudent.values());
        rows.sort(Comparator.comparingInt(DuelRankingDto::getWins).reversed()
                .thenComparingInt(DuelRankingDto::getLosses)
                .thenComparing(r -> -(r.getWins() + r.getLosses() + r.getDraws()))
                .thenComparing(DuelRankingDto::getName, String.CASE_INSENSITIVE_ORDER));
        return rows.stream().limit(10).toList();
    }

    private void tally(Map<Long, DuelRankingDto> byStudent, Student s, Long winnerId) {
        DuelRankingDto row = byStudent.computeIfAbsent(s.getId(), id -> {
            DuelRankingDto r = new DuelRankingDto();
            r.setStudentId(s.getId());
            r.setName(s.getName());
            r.setPhotoUrl(s.getPhotoUrl());
            return r;
        });
        if (winnerId == null) row.setDraws(row.getDraws() + 1);
        else if (winnerId.equals(s.getId())) row.setWins(row.getWins() + 1);
        else row.setLosses(row.getLosses() + 1);
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

        dto.setFormat(d.getFormat());
        dto.setModality(d.getModality());
        dto.setMessage(d.getMessage());
        dto.setScheduledAt(d.getScheduledAt());
        dto.setLocation(d.getLocation());

        dto.setWinnerStudentId(d.getWinnerStudentId());
        if (d.getWinnerStudentId() != null) {
            dto.setWinnerName(d.getWinnerStudentId().equals(c.getId()) ? c.getName() : o.getName());
        }
        dto.setMethod(d.getMethod() != null ? d.getMethod().name() : null);
        dto.setSubmissionName(d.getSubmissionName());
        dto.setChallengerScore(d.getChallengerScore());
        dto.setOpponentScore(d.getOpponentScore());
        dto.setResultNotes(d.getResultNotes());
        dto.setReportedBy(d.getReportedBy());
        dto.setCloseReason(d.getCloseReason() != null ? d.getCloseReason().name() : null);

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

    private static final Set<String> FORMATS = Set.of("SUBMISSION", "COMBAT_JJ", "MMA", "NO_RULES");

    private String parseFormat(String v) {
        if (v == null || v.isBlank()) return null;
        String up = v.trim().toUpperCase();
        if (!FORMATS.contains(up)) {
            throw new IllegalArgumentException("Modo no válido (SUBMISSION/COMBAT_JJ/MMA/NO_RULES).");
        }
        return up;
    }

    private Duel.CloseReason parseCloseReason(String v) {
        if (v == null || v.isBlank()) {
            throw new IllegalArgumentException("Indica por qué cierras el duelo.");
        }
        try {
            return Duel.CloseReason.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Razón no válida (SCARED/POSTPONED).");
        }
    }

    private Duel.Method parseMethod(String v) {
        if (v == null || v.isBlank()) {
            throw new IllegalArgumentException("Indica cómo terminó el duelo.");
        }
        try {
            return Duel.Method.valueOf(v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Método no válido (SUBMISSION/POINTS/DECISION/DRAW/DISQUALIFICATION).");
        }
    }

    private String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** A bout score is a non-negative number; null stays null. */
    private Integer clampScore(Integer v) {
        if (v == null) return null;
        return v < 0 ? 0 : v;
    }
}
