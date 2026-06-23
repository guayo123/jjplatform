package com.jjplatform.api.repository;

import com.jjplatform.api.model.Duel;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface DuelRepository extends JpaRepository<Duel, Long> {

    /** Duels involving the student (as challenger, opponent or referee), newest activity first. */
    @Query("select d from Duel d where d.challenger.id = :studentId or d.opponent.id = :studentId "
            + "or d.referee.id = :studentId order by d.updatedAt desc")
    List<Duel> findInvolving(@Param("studentId") Long studentId);

    /** Academy feed: duels in the given academy with one of the statuses, newest activity first. */
    List<Duel> findByAcademyIdAndStatusInOrderByUpdatedAtDesc(Long academyId, Collection<Duel.Status> statuses);

    /** All bouts in a given status — used by the daily sweep to find unresolved accepted duels. */
    List<Duel> findByStatus(Duel.Status status);

    /** Bouts of one academy in a given status — used by the admin's manual expiry trigger. */
    List<Duel> findByAcademyIdAndStatus(Long academyId, Duel.Status status);

    // --- Paginated academy feed (keyset / cursor on updatedAt+id, newest first) ---------------
    // The cursor predicate "(updatedAt < :t) or (updatedAt = :t and id < :id)" walks strictly older
    // rows; the first page passes a far-future sentinel so it includes everything. Pageable carries
    // the page size and the matching ORDER BY (updatedAt desc, id desc). Keyset stays correct and
    // fast as new duels arrive — unlike OFFSET, which skips/repeats rows when the head shifts.

    /** "Resultados" tab page: completed + rejected bouts older than the cursor. */
    @Query("select d from Duel d where d.academy.id = :academyId and d.status in :statuses "
            + "and (d.updatedAt < :cursorTime or (d.updatedAt = :cursorTime and d.id < :cursorId))")
    List<Duel> feedResultsPage(@Param("academyId") Long academyId,
                               @Param("statuses") Collection<Duel.Status> statuses,
                               @Param("cursorTime") LocalDateTime cursorTime,
                               @Param("cursorId") Long cursorId,
                               Pageable pageable);

    /** "Sin resolver" tab page: expired bouts + ones a fighter closed (with reason), older than the cursor. */
    @Query("select d from Duel d where d.academy.id = :academyId "
            + "and (d.status = :expired or (d.status = :cancelled and d.closeReason is not null)) "
            + "and (d.updatedAt < :cursorTime or (d.updatedAt = :cursorTime and d.id < :cursorId))")
    List<Duel> feedUnresolvedPage(@Param("academyId") Long academyId,
                                  @Param("expired") Duel.Status expired,
                                  @Param("cancelled") Duel.Status cancelled,
                                  @Param("cursorTime") LocalDateTime cursorTime,
                                  @Param("cursorId") Long cursorId,
                                  Pageable pageable);
}
