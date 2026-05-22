package com.jjplatform.api.config;

import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.TournamentRepository;
import com.jjplatform.api.repository.UserRepository;
import com.jjplatform.api.service.BracketService;
import com.jjplatform.api.service.DefaultDisciplineService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AcademyRepository academyRepository;
    private final DefaultDisciplineService defaultDisciplineService;
    private final TournamentRepository tournamentRepository;
    private final BracketService bracketService;

    @Bean
    @Order(1)
    CommandLineRunner seedSuperAdmin() {
        return args -> {
            String email = "superadmin@jjplatform.com";
            if (!userRepository.existsByEmail(email)) {
                User superAdmin = User.builder()
                        .email(email)
                        .password(passwordEncoder.encode("superadmin123"))
                        .role(User.Role.SUPER_ADMIN)
                        .build();
                userRepository.save(superAdmin);
            }
        };
    }

    /**
     * One-time migration: ensures every existing academy has Jiu Jitsu configured.
     * New academies get it automatically via AuthService.register().
     */
    @Bean
    @Order(2)
    CommandLineRunner seedJiuJitsuForExistingAcademies() {
        return args -> academyRepository.findAll()
                .forEach(defaultDisciplineService::createJiuJitsuIfAbsent);
    }

    @Bean
    @Order(3)
    CommandLineRunner seedKickboxingForExistingAcademies() {
        return args -> academyRepository.findAll()
                .forEach(defaultDisciplineService::createKickboxingIfAbsent);
    }

    /**
     * One-time backfill: migrates each student's legacy global belt to a
     * StudentDiscipline under Jiu Jitsu. Runs after the Jiu Jitsu seeder so
     * the discipline, age categories and belts already exist. Idempotent.
     */
    @Bean
    @Order(4)
    CommandLineRunner backfillStudentDisciplines() {
        return args -> academyRepository.findAll().forEach(academy -> {
            try {
                defaultDisciplineService.backfillJiuJitsuFromLegacyBelt(academy);
            } catch (Exception e) {
                log.warn("backfillJiuJitsuFromLegacyBelt failed for academy {}: {}",
                        academy.getId(), e.getMessage());
            }
        });
    }

    /**
     * One-time repair: scans every tournament bracket and propagates BYEs that
     * were left without a winner due to the pre-fix generator. Idempotent.
     */
    @Bean
    @Order(5)
    CommandLineRunner repairBracketByes() {
        return args -> tournamentRepository.findAll().forEach(t -> {
            try {
                bracketService.repairByeAdvances(t);
            } catch (Exception e) {
                log.warn("repairByeAdvances failed for tournament {}: {}", t.getId(), e.getMessage());
            }
        });
    }
}
