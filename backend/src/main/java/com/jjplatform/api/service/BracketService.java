package com.jjplatform.api.service;

import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.BracketMatch;
import com.jjplatform.api.model.Tournament;
import com.jjplatform.api.model.TournamentParticipant;
import com.jjplatform.api.repository.BracketMatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Generates single-elimination tournament brackets.
 *
 * For CATEGORIAS tournaments, participants are automatically grouped by
 * (ageCategory + belt + weightCategory) and each group gets its own bracket.
 * For ABSOLUTO tournaments, all participants share a single bracket.
 */
@Service
@RequiredArgsConstructor
public class BracketService {

    private final BracketMatchRepository matchRepository;

    @Transactional
    public void generateBracket(Tournament tournament) {
        matchRepository.deleteByTournamentId(tournament.getId());
        tournament.getMatches().clear();

        if (tournament.getTipo() == Tournament.TournamentTipo.ABSOLUTO) {
            generateGroupBracket(tournament, new ArrayList<>(tournament.getParticipants()), null);
        } else {
            // Group participants by ageCategory + belt + weightCategory
            Map<String, List<TournamentParticipant>> groups = new LinkedHashMap<>();
            for (TournamentParticipant p : tournament.getParticipants()) {
                String age    = p.getAgeCategory()   != null ? p.getAgeCategory()   : "Sin edad";
                String belt   = p.getStudent().getBelt()   != null ? p.getStudent().getBelt()   : "Sin cinturón";
                String weight = p.getWeightCategory() != null ? p.getWeightCategory() : "Sin peso";
                String key = age + " / " + belt + " / " + weight;
                groups.computeIfAbsent(key, k -> new ArrayList<>()).add(p);
            }
            for (Map.Entry<String, List<TournamentParticipant>> entry : groups.entrySet()) {
                generateGroupBracket(tournament, entry.getValue(), entry.getKey());
            }
        }
    }

    private void generateGroupBracket(Tournament tournament,
                                       List<TournamentParticipant> groupParticipants,
                                       String categoryGroup) {
        List<TournamentParticipant> participants = new ArrayList<>(groupParticipants);
        Collections.shuffle(participants);

        // Single participant → auto-winner (bye match)
        if (participants.size() == 1) {
            BracketMatch match = BracketMatch.builder()
                    .tournament(tournament)
                    .categoryGroup(categoryGroup)
                    .round(1)
                    .matchNumber(1)
                    .participant1(participants.get(0))
                    .winner(participants.get(0))
                    .build();
            matchRepository.save(match);
            return;
        }

        int totalSlots = nextPowerOf2(participants.size());
        int totalRounds = (int) (Math.log(totalSlots) / Math.log(2));

        while (participants.size() < totalSlots) {
            participants.add(null);
        }

        List<BracketMatch> currentRound = new ArrayList<>();
        int matchNumber = 1;

        for (int i = 0; i < totalSlots; i += 2) {
            BracketMatch match = BracketMatch.builder()
                    .tournament(tournament)
                    .categoryGroup(categoryGroup)
                    .round(1)
                    .matchNumber(matchNumber++)
                    .participant1(participants.get(i))
                    .participant2(participants.get(i + 1))
                    .build();

            if (match.getParticipant1() == null && match.getParticipant2() != null) {
                match.setWinner(match.getParticipant2());
            } else if (match.getParticipant2() == null && match.getParticipant1() != null) {
                match.setWinner(match.getParticipant1());
            }

            match = matchRepository.save(match);
            currentRound.add(match);
        }

        for (int round = 2; round <= totalRounds; round++) {
            List<BracketMatch> nextRound = new ArrayList<>();
            matchNumber = 1;

            for (int i = 0; i < currentRound.size(); i += 2) {
                BracketMatch match = BracketMatch.builder()
                        .tournament(tournament)
                        .categoryGroup(categoryGroup)
                        .round(round)
                        .matchNumber(matchNumber++)
                        .build();

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
    public void recordResult(Tournament tournament, Long matchId, Long winnerId, String resultType) {
        BracketMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

        if (!match.getTournament().getId().equals(tournament.getId())) {
            throw new ResourceNotFoundException("Match not found in this tournament");
        }

        boolean validWinner = (match.getParticipant1() != null && match.getParticipant1().getId().equals(winnerId))
                || (match.getParticipant2() != null && match.getParticipant2().getId().equals(winnerId));

        if (!validWinner) {
            throw new IllegalArgumentException("Winner must be one of the match participants");
        }

        TournamentParticipant winner = match.getParticipant1().getId().equals(winnerId)
                ? match.getParticipant1()
                : match.getParticipant2();

        match.setWinner(winner);
        if (resultType != null) {
            match.setResultType(BracketMatch.MatchResultType.valueOf(resultType));
        }
        matchRepository.save(match);

        advanceWinner(tournament, match, winner);
    }

    private void advanceWinner(Tournament tournament, BracketMatch match, TournamentParticipant winner) {
        List<BracketMatch> allMatches = matchRepository
                .findByTournamentIdOrderByRoundAscMatchNumberAsc(tournament.getId());

        int nextRound       = match.getRound() + 1;
        int nextMatchNumber = (match.getMatchNumber() + 1) / 2;
        String categoryGroup = match.getCategoryGroup();

        allMatches.stream()
                .filter(m -> m.getRound() == nextRound
                        && m.getMatchNumber() == nextMatchNumber
                        && Objects.equals(m.getCategoryGroup(), categoryGroup))
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
        while (power < n) power *= 2;
        return power;
    }
}
