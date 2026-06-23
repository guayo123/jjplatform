package com.jjplatform.api.repository;

import com.jjplatform.api.model.Duel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
