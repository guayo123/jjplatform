package com.jjplatform.api.repository;

import com.jjplatform.api.model.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {
    List<Tournament> findByAcademyIdOrderByDateDesc(Long academyId);
}
