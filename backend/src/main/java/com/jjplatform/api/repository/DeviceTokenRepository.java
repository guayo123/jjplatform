package com.jjplatform.api.repository;

import com.jjplatform.api.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    void deleteByToken(String token);

    /** All device tokens of students in the given academy (used to broadcast a push). */
    @Query("select d from DeviceToken d where d.student.academy.id = :academyId")
    List<DeviceToken> findByAcademyId(@Param("academyId") Long academyId);
}
