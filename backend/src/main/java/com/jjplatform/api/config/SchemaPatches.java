package com.jjplatform.api.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Idempotent schema fixes that {@code ddl-auto: update} can't do on its own.
 *
 * <p>Hibernate 6 auto-generates a {@code CHECK (col IN (...))} constraint for every
 * {@code @Enumerated(EnumType.STRING)} column <em>when the table is first created</em>, listing only
 * the enum values that existed then. Adding new enum constants later does NOT alter that constraint
 * ({@code update} never touches existing constraints), so inserts with the new values fail with a
 * check-constraint violation. We drop the stale constraints here; the Java enum stays the source of
 * truth (Hibernate only ever writes valid names), so dropping is safe and survives future additions.
 */
@Configuration
@RequiredArgsConstructor
public class SchemaPatches {

    private static final Logger log = LoggerFactory.getLogger(SchemaPatches.class);

    private final JdbcTemplate jdbc;

    @Bean
    @Order(0) // before the data seeders
    CommandLineRunner dropStaleEnumChecks() {
        return args -> {
            // training_sessions.modality gained OPEN_MAT / COMPETITION after the table existed.
            dropConstraint("training_sessions", "training_sessions_modality_check");
        };
    }

    private void dropConstraint(String table, String constraint) {
        try {
            jdbc.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
            log.info("SchemaPatches: ensured {} has no stale constraint {}", table, constraint);
        } catch (Exception e) {
            // Non-fatal: e.g. table not created yet on a brand-new DB, or a non-Postgres dialect.
            log.warn("SchemaPatches: could not drop {} on {}: {}", constraint, table, e.getMessage());
        }
    }
}
