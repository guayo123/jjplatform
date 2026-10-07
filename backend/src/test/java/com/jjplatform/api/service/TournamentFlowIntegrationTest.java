package com.jjplatform.api.service;

import com.jjplatform.api.dto.TournamentDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Full tournament flow through the real service + JPA (H2): create, enrol, generate the bracket, play
 * every match through the same entry point the API uses, and check the response the UI receives at each
 * step (bracket present, status, champion).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tournamentflow;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class TournamentFlowIntegrationTest {

    @Autowired TournamentService tournamentService;
    @Autowired AcademyRepository academyRepository;
    @Autowired UserRepository userRepository;
    @Autowired StudentRepository studentRepository;

    private Academy academy(String email) {
        User u = userRepository.save(User.builder().email(email).password("x").role(User.Role.ADMIN).build());
        return academyRepository.save(Academy.builder().user(u).name("A " + email).build());
    }

    private Student student(Academy a, String name, String belt, double weight, int age) {
        return studentRepository.save(Student.builder().academy(a).name(name).belt(belt)
                .weight(weight).birthDate(LocalDate.now().minusYears(age)).active(true).build());
    }

    private TournamentDto playToTheEnd(TournamentDto t, Long tournamentId, Long academyId) {
        boolean progress = true;
        while (progress) {
            progress = false;
            for (TournamentDto.BracketMatchDto m : new ArrayList<>(t.getMatches())) {
                if (m.getWinnerId() == null && m.getParticipant1() != null && m.getParticipant2() != null) {
                    t = tournamentService.recordMatchResult(tournamentId, m.getId(),
                            m.getParticipant1().getId(), "PUNTOS", academyId);
                    progress = true;
                }
            }
        }
        return t;
    }

    @Test
    void absoluteTournamentWithSixFightersEndsWithAChampion() {
        Academy a = academy("abs@test.cl");
        TournamentDto dto = new TournamentDto();
        dto.setName("Absoluto");
        dto.setDate(LocalDate.now().plusDays(3));
        dto.setTipo("ABSOLUTO");
        TournamentDto created = tournamentService.createTournament(dto, a.getId());
        Long id = created.getId();

        for (int i = 1; i <= 6; i++) {
            Student s = student(a, "Luchador " + i, "Blanca", 70 + i, 25);
            tournamentService.addParticipant(id, s.getId(), a.getId());
        }

        TournamentDto generated = tournamentService.generateBracket(id, a.getId());
        assertThat(generated.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(generated.getMatches()).as("la respuesta de generar debe traer el bracket").isNotEmpty();

        TournamentDto finished = playToTheEnd(generated, id, a.getId());
        assertThat(finished.getStatus()).isEqualTo("COMPLETED");
        assertThat(finished.getChampionName()).isNotBlank();
    }

    @Test
    void absoluteTournamentIgnoresBeltWeightAndAge() {
        Academy a = academy("mix@test.cl");
        TournamentDto dto = new TournamentDto();
        dto.setName("Interno");
        dto.setDate(LocalDate.now().plusDays(3));
        dto.setTipo("ABSOLUTO");
        Long id = tournamentService.createTournament(dto, a.getId()).getId();

        // Cinturones, pesos y edades muy distintos entre sí
        List<Student> students = List.of(
                student(a, "Niño blanca",   "Blanca", 30, 8),
                student(a, "Juvenil azul",  "Azul",   60, 16),
                student(a, "Adulto morada", "Morada", 80, 28),
                student(a, "Master marrón", "Marrón", 95, 42),
                student(a, "Pesado negra",  "Negra",  110, 33));
        for (Student s : students) tournamentService.addParticipant(id, s.getId(), a.getId());

        TournamentDto generated = tournamentService.generateBracket(id, a.getId());
        assertThat(generated.getMatches()).extracting(TournamentDto.BracketMatchDto::getCategoryGroup)
                .as("una sola llave, sin grupos por categoría").containsOnlyNulls();
        // 5 luchadores → llave de 8 (4 + 2 + 1 combates)
        assertThat(generated.getMatches()).hasSize(7);
        long inRoundOne = generated.getMatches().stream()
                .filter(m -> m.getRound() == 1)
                .flatMap(m -> java.util.stream.Stream.of(m.getParticipant1(), m.getParticipant2()))
                .filter(java.util.Objects::nonNull).count();
        assertThat(inRoundOne).as("los 5 están en la misma llave").isEqualTo(5);

        TournamentDto finished = playToTheEnd(generated, id, a.getId());
        assertThat(finished.getStatus()).isEqualTo("COMPLETED");
        assertThat(finished.getChampionName()).isNotBlank();
    }

    @Test
    void categoryTournamentGroupsFightersAndEveryGroupGetsAFinal() {
        Academy a = academy("cat@test.cl");
        TournamentDto dto = new TournamentDto();
        dto.setName("Por categorías");
        dto.setDate(LocalDate.now().plusDays(3));
        dto.setTipo("CATEGORIAS");
        Long id = tournamentService.createTournament(dto, a.getId()).getId();

        List<Student> students = List.of(
                student(a, "Adulto Blanca 1", "Blanca", 69, 25),
                student(a, "Adulto Blanca 2", "Blanca", 68, 26),
                student(a, "Adulto Blanca 3", "Blanca", 67, 27),
                student(a, "Adulto Azul 1",   "Azul",   69, 25),
                student(a, "Adulto Azul 2",   "Azul",   68, 26),
                student(a, "Infantil solo",   "Blanca", 35, 11));
        for (Student s : students) tournamentService.addParticipant(id, s.getId(), a.getId());

        TournamentDto generated = tournamentService.generateBracket(id, a.getId());
        long groups = generated.getMatches().stream().map(TournamentDto.BracketMatchDto::getCategoryGroup).distinct().count();
        assertThat(groups).isEqualTo(3);

        TournamentDto finished = playToTheEnd(generated, id, a.getId());
        assertThat(finished.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void seedsAreValidatedAndHonouredWhenGeneratingTheBracket() {
        Academy a = academy("seed@test.cl");
        TournamentDto dto = new TournamentDto();
        dto.setName("Con cabezas de serie");
        dto.setDate(LocalDate.now().plusDays(3));
        dto.setTipo("ABSOLUTO");
        Long id = tournamentService.createTournament(dto, a.getId()).getId();

        TournamentDto t = null;
        for (int i = 1; i <= 6; i++) {
            t = tournamentService.addParticipant(id, student(a, "L" + i, "Blanca", 70, 25).getId(), a.getId());
        }
        List<TournamentDto.ParticipantDto> ps = t.getParticipants();
        Long first = ps.get(0).getId();
        Long second = ps.get(1).getId();

        tournamentService.setSeed(id, first, 1, a.getId());
        TournamentDto afterSecond = tournamentService.setSeed(id, second, 2, a.getId());
        assertThat(afterSecond.getParticipants()).filteredOn(p -> p.getSeedRank() != null).hasSize(2);

        // Número repetido o fuera de rango → error controlado
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> tournamentService.setSeed(id, ps.get(2).getId(), 1, a.getId()));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> tournamentService.setSeed(id, ps.get(2).getId(), 7, a.getId()));

        // Quitar el cabeza de serie
        tournamentService.setSeed(id, second, null, a.getId());
        tournamentService.setSeed(id, second, 2, a.getId());

        TournamentDto generated = tournamentService.generateBracket(id, a.getId());
        // Con 6 en una llave de 8 sobran 2 puestos: los cabezas 1 y 2 tienen BYE (ya figuran con ganador)
        long byeMatchesWithSeed = generated.getMatches().stream()
                .filter(m -> m.getRound() == 1 && m.getWinnerId() != null)
                .filter(m -> (m.getParticipant1() != null && m.getParticipant1().getSeedRank() != null)
                        || (m.getParticipant2() != null && m.getParticipant2().getSeedRank() != null))
                .count();
        assertThat(byeMatchesWithSeed).isEqualTo(2);

        // Ya con el bracket generado no se pueden tocar
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
                () -> tournamentService.setSeed(id, first, null, a.getId()));
    }
}
