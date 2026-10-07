package com.jjplatform.api.service;

import com.jjplatform.api.model.BracketMatch;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.Tournament;
import com.jjplatform.api.model.TournamentParticipant;
import com.jjplatform.api.repository.BracketMatchRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;

/**
 * Plays whole brackets (every size 2..40, both tournament types) against an in-memory fake of the
 * match repository and checks the tournament can always be played to the end and is then detected
 * as finished with a champion per bracket.
 */
class BracketServiceSimulationTest {

    private final List<BracketMatch> store = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(1);
    private BracketService service;

    private void setUpRepo() {
        store.clear();
        ids.set(1);
        BracketMatchRepository repo = mock(BracketMatchRepository.class);
        when(repo.save(any(BracketMatch.class))).thenAnswer(inv -> {
            BracketMatch m = inv.getArgument(0);
            if (m.getId() == null) {
                m.setId(ids.getAndIncrement());
                store.add(m);
            }
            return m;
        });
        when(repo.findById(anyLong())).thenAnswer(inv ->
                store.stream().filter(m -> m.getId().equals(inv.getArgument(0))).findFirst());
        when(repo.findByTournamentIdOrderByRoundAscMatchNumberAsc(anyLong())).thenAnswer(inv ->
                store.stream()
                        .sorted(Comparator.comparing(BracketMatch::getRound).thenComparing(BracketMatch::getMatchNumber))
                        .toList());
        doAnswer(inv -> { store.clear(); return null; }).when(repo).deleteByTournamentId(anyLong());
        service = new BracketService(repo);
    }

    private Tournament tournament(int n, Tournament.TournamentTipo tipo) {
        Tournament t = Tournament.builder().id(1L).name("T").tipo(tipo).build();
        for (int i = 1; i <= n; i++) {
            Student s = Student.builder().id((long) i).name("S" + i).belt("Blanca").build();
            t.getParticipants().add(TournamentParticipant.builder()
                    .id((long) i).tournament(t).student(s).seed(i)
                    .ageCategory("Adulto").weightCategory("Leve").build());
        }
        return t;
    }

    /** Plays every playable match (both fighters present, no winner yet) until none are left. */
    private int playAll(Tournament t) {
        int played = 0;
        boolean progress = true;
        while (progress) {
            progress = false;
            for (BracketMatch m : new ArrayList<>(store)) {
                if (m.getWinner() == null && m.getParticipant1() != null && m.getParticipant2() != null) {
                    service.recordResult(t, m.getId(), m.getParticipant1().getId(), "PUNTOS");
                    played++;
                    progress = true;
                }
            }
        }
        return played;
    }

    @Test
    void everyBracketSizeCanBePlayedToTheEndAndIsDetectedAsFinished() {
        List<String> problems = new ArrayList<>();
        for (Tournament.TournamentTipo tipo : Tournament.TournamentTipo.values()) {
            for (int n = 2; n <= 40; n++) {
                setUpRepo();
                Tournament t = tournament(n, tipo);
                service.generateBracket(t);
                playAll(t);

                boolean finished = service.isComplete(store);
                boolean legacyCheck = !store.isEmpty() && store.stream().allMatch(m -> m.getWinner() != null);
                if (!finished) problems.add(tipo + " n=" + n + ": no se detecta como finalizado");
                if (!legacyCheck && finished) {
                    // documenta los tamaños donde la comprobación antigua nunca terminaba
                    System.out.println("antigua comprobación fallaba en " + tipo + " n=" + n);
                }
            }
        }
        assertThat(problems).isEmpty();
    }

    @Test
    void championMustBeAllParticipantsOnlyOnce() {
        setUpRepo();
        Tournament t = tournament(6, Tournament.TournamentTipo.ABSOLUTO);
        service.generateBracket(t);
        int played = playAll(t);
        // 6 jugadores → 5 combates reales
        assertThat(played).isEqualTo(5);
    }

    @Test
    void recordingAWinnerOnAMatchWithOnlyOneFighterDoesNotCrash() {
        setUpRepo();
        Tournament t = tournament(3, Tournament.TournamentTipo.ABSOLUTO);
        service.generateBracket(t);
        BracketMatch semi = store.stream()
                .filter(m -> m.getRound() == 2).findFirst().orElseThrow();
        Long soleFighter = (semi.getParticipant1() != null ? semi.getParticipant1() : semi.getParticipant2()).getId();
        // No debe lanzar NullPointerException (si acaso una excepción de validación controlada).
        try {
            service.recordResult(t, semi.getId(), soleFighter, "PUNTOS");
        } catch (NullPointerException e) {
            throw new AssertionError("NPE al registrar ganador en llave con un solo luchador", e);
        } catch (RuntimeException expected) {
            // ok: rechazo controlado
        }
    }

    @Test
    void bracketOrderPutsTopSeedsInOppositeHalves() {
        assertThat(BracketService.bracketOrder(2)).containsExactly(1, 2);
        assertThat(BracketService.bracketOrder(4)).containsExactly(1, 4, 2, 3);
        assertThat(BracketService.bracketOrder(8)).containsExactly(1, 8, 4, 5, 2, 7, 3, 6);
    }

    @Test
    void topSeedsGetByesAndMeetOnlyInTheFinal() {
        for (int n = 3; n <= 40; n++) {
            setUpRepo();
            Tournament t = tournament(n, Tournament.TournamentTipo.ABSOLUTO);
            // Los participantes 1..4 son cabezas de serie 1..4 (cuando existen)
            for (int i = 0; i < Math.min(4, n); i++) {
                t.getParticipants().get(i).setSeedRank(i + 1);
            }
            service.generateBracket(t);

            int slots = Integer.highestOneBit(n - 1) * 2; // siguiente potencia de 2 (n >= 3)
            List<BracketMatch> round1 = store.stream().filter(m -> m.getRound() == 1).toList();
            int half = slots / 4; // combates de ronda 1 por mitad de la llave

            // Seed 1 en la mitad superior y seed 2 en la inferior → solo pueden cruzarse en la final
            BracketMatch m1 = matchOf(round1, 1L);
            BracketMatch m2 = matchOf(round1, 2L);
            assertThat(m1.getMatchNumber()).as("n=%d seed1 arriba", n).isLessThanOrEqualTo(half);
            assertThat(m2.getMatchNumber()).as("n=%d seed2 abajo", n).isGreaterThan(half);

            // Sin dobles BYE: ningún combate de ronda 1 queda vacío
            assertThat(round1).as("n=%d sin combates vacíos", n)
                    .allMatch(m -> m.getParticipant1() != null || m.getParticipant2() != null);

            // Los mejores cabezas de serie reciben el pase (su rival es BYE) cuando sobran puestos
            int byes = slots - n;
            for (long seed = 1; seed <= Math.min(byes, 4); seed++) {
                BracketMatch m = matchOf(round1, seed);
                assertThat(m.getParticipant1() == null || m.getParticipant2() == null)
                        .as("n=%d seed %d debería tener BYE", n, seed).isTrue();
                assertThat(m.getWinner()).isNotNull();
            }

            playAll(t);
            assertThat(service.isComplete(store)).as("n=%d termina", n).isTrue();
        }
    }

    private BracketMatch matchOf(List<BracketMatch> matches, long participantId) {
        return matches.stream()
                .filter(m -> (m.getParticipant1() != null && m.getParticipant1().getId() == participantId)
                        || (m.getParticipant2() != null && m.getParticipant2().getId() == participantId))
                .findFirst().orElseThrow();
    }
}
