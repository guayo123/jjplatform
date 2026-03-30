package com.jjplatform.api.config;

import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
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
}
