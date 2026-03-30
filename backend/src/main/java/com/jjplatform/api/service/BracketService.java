package com.jjplatform.api.service;

import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.BracketMatch;
import com.jjplatform.api.model.Tournament;
import com.jjplatform.api.model.TournamentParticipant;
import com.jjplatform.api.repository.BracketMatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Generates single-elimination tournament brackets.
 *
 * Algorithm:
 * 1. Shuffle participants for random seeding
 * 2. Calculate total rounds = ceil(log2(participants))
 * 3. Pad to next power of 2 with "byes" (null slots)
 * 4. Create matches for first round, assigning participants
 * 5. Create empty matches for subsequent rounds
 * 6. Auto-advance participants with byes
 */
@Service
@RequiredArgsConstructor
public class BracketService {

    private final BracketMatchRepository matchRepository;

    @Transactional
    public void generateBracket(Tournament tournament) {
        // Clear existing matches
        matchRepository.deleteByTournamentId(tournament.getId());
        tournament.getMatches().clear();

        List<TournamentParticipant> participants = new ArrayList<>(tournament.getParticipants());
        Collections.shuffle(participants);

        int n = participants.size();
        int totalSlots = nextPowerOf2(n);
        int totalRounds = (int) (Math.log(totalSlots) / Math.log(2));

        // Pad with null (byes)
        while (participants.size() < totalSlots) {
            participants.add(null);
        }

        // Generate first round matches
        List<BracketMatch> currentRound = new ArrayList<>();
        int matchNumber = 1;

        for (int i = 0; i < totalSlots; i += 2) {
            BracketMatch match = BracketMatch.builder()
                    .tournament(tournament)
                    .round(1)
                    .matchNumber(matchNumber++)
                    .participant1(participants.get(i))
                    .participant2(participants.get(i + 1))
                    .build();

            // Auto-advance if bye
            if (match.getParticipant1() == null && match.getParticipant2() != null) {
                match.setWinner(match.getParticipant2());
            } else if (match.getParticipant2() == null && match.getParticipant1() != null) {
                match.setWinner(match.getParticipant1());
            }

            match = matchRepository.save(match);
            currentRound.add(match);
        }

        // Generate subsequent rounds
        for (int round = 2; round <= totalRounds; round++) {
            List<BracketMatch> nextRound = new ArrayList<>();
            matchNumber = 1;

            for (int i = 0; i < currentRound.size(); i += 2) {
                BracketMatch match = BracketMatch.builder()
                        .tournament(tournament)
                        .round(round)
                        .matchNumber(matchNumber++)
                        .build();

                // Auto-fill from bye winners of previous round
                BracketMatch prev1 = currentRound.get(i);
                BracketMatch prev2 = currentRound.get(i + 1);

                if (prev1.getWinner() != null && prev2.getWinner() != null) {
                    match.setParticipant1(prev1.getWinner());
                    match.setParticipant2(prev2.getWinner());
                } else if (prev1.getWinner() != null) {
                    match.setParticipant1(prev1.getWinner());
                } else if (prev2.getWinner() != null) {
                    match.setParticipant2(prev2.getWinner());
                }

                match = matchRepository.save(match);
                nextRound.add(match);
            }

            currentRound = nextRound;
        }
    }

    @Transactional
    public void recordResult(Tournament tournament, Long matchId, Long winnerId) {
        BracketMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

        if (!match.getTournament().getId().equals(tournament.getId())) {
            throw new ResourceNotFoundException("Match not found in this tournament");
        }

        // Validate winner is one of the participants
        boolean validWinner = (match.getParticipant1() != null && match.getParticipant1().getId().equals(winnerId))
                || (match.getParticipant2() != null && match.getParticipant2().getId().equals(winnerId));

        if (!validWinner) {
            throw new IllegalArgumentException("Winner must be one of the match participants");
        }

        TournamentParticipant winner = match.getParticipant1().getId().equals(winnerId)
                ? match.getParticipant1()
                : match.getParticipant2();

        match.setWinner(winner);
        matchRepository.save(match);

        // Advance winner to next round
        advanceWinner(tournament, match, winner);
    }

    private void advanceWinner(Tournament tournament, BracketMatch match, TournamentParticipant winner) {
        List<BracketMatch> allMatches = matchRepository
                .findByTournamentIdOrderByRoundAscMatchNumberAsc(tournament.getId());

        int nextRound = match.getRound() + 1;
        int nextMatchNumber = (match.getMatchNumber() + 1) / 2;

        allMatches.stream()
                .filter(m -> m.getRound() == nextRound && m.getMatchNumber() == nextMatchNumber)
                .findFirst()
                .ifPresent(nextMatch -> {
                    if (match.getMatchNumber() % 2 == 1) {
                        nextMatch.setParticipant1(winner);
                    } else {
                        nextMatch.setParticipant2(winner);
                    }
                    matchRepository.save(nextMatch);
                });
    }

    private int nextPowerOf2(int n) {
        int power = 1;
        while (power < n) {
            power *= 2;
        }
        return power;
    }
}
