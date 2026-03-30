package com.jjplatform.api.repository;

import com.jjplatform.api.model.TournamentParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentParticipantRepository extends JpaRepository<TournamentParticipant, Long> {
    List<TournamentParticipant> findByTournamentId(Long tournamentId);
    boolean existsByTournamentIdAndStudentId(Long tournamentId, Long studentId);
}
