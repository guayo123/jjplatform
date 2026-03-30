package com.jjplatform.api.repository;

import com.jjplatform.api.model.BracketMatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BracketMatchRepository extends JpaRepository<BracketMatch, Long> {
    List<BracketMatch> findByTournamentIdOrderByRoundAscMatchNumberAsc(Long tournamentId);
    void deleteByTournamentId(Long tournamentId);
}
