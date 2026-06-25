package com.jjplatform.api.repository;

import com.jjplatform.api.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    /**
     * Self-transactional delete: the stale-token prune runs from an async thread (no ambient
     * transaction), and a derived delete needs one of its own — without this it threw
     * "No EntityManager with actual transaction available" and the prune never happened.
     */
    @Modifying
    @Transactional
    void deleteByToken(String token);

    /** All device tokens of students in the given academy (used to broadcast a push). */
    @Query("select d from DeviceToken d where d.student.academy.id = :academyId")
    List<DeviceToken> findByAcademyId(@Param("academyId") Long academyId);

    /** Device tokens of the given students (used to push the people involved in a duel). */
    @Query("select d from DeviceToken d where d.student.id in :studentIds")
    List<DeviceToken> findByStudentIdIn(@Param("studentIds") Collection<Long> studentIds);
}
