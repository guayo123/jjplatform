package com.jjplatform.api.config;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register", "/api/auth/student-register").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/public/webhooks/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                // Any authenticated user (including STUDENT on first login) may change their own password
                .requestMatchers(HttpMethod.POST, "/api/auth/change-password").authenticated()
                // Student portal: STUDENT can only read its own record here, and nowhere else
                .requestMatchers("/api/portal/**").hasRole("STUDENT")
                .requestMatchers("/api/super", "/api/super/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/payments/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                .requestMatchers(HttpMethod.PUT, "/api/payments/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                .requestMatchers(HttpMethod.DELETE, "/api/payments/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                .requestMatchers(HttpMethod.POST, "/api/students/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                .requestMatchers(HttpMethod.PUT, "/api/students/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                .requestMatchers(HttpMethod.DELETE, "/api/students/**").hasAnyRole("ADMIN", "ENCARGADO", "PROFESOR")
                // Everything else is staff/admin area — STUDENT is intentionally excluded
                .anyRequest().hasAnyRole("ADMIN", "SUPER_ADMIN", "PROFESOR", "ENCARGADO")
            )
            // Unauthenticated -> 401 (so the SPA can redirect to login);
            // authenticated but forbidden -> 403. Without this, Spring's
            // default returns 403 for both, leaving expired sessions stuck.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"message\":\"No autenticado\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"message\":\"No autorizado\"}");
                })
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
