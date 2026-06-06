package com.jjplatform.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test: boots the full Spring context against an in-memory H2 database.
 * Catches broken bean wiring, JPA entity mapping errors and schema-generation
 * problems before they reach a deployment. Runs as part of `mvn verify` / CI.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class JJPlatformApplicationTests {

    @Test
    void contextLoads() {
        // Intentionally empty: success means the application context started.
    }
}
