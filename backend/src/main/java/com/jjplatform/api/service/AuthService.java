package com.jjplatform.api.service;

import com.jjplatform.api.config.JwtUtil;
import com.jjplatform.api.dto.LoginRequest;
import com.jjplatform.api.dto.LoginResponse;
import com.jjplatform.api.dto.RegisterRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AcademyRepository academyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        Long academyId;
        String academyName;
        if (user.getRole() == User.Role.SUPER_ADMIN) {
            // Super admins have no academy of their own
            String token = jwtUtil.generateToken(user.getEmail(), user.getId());
            return new LoginResponse(token, user.getEmail(), null, null, user.getRole().name());
        } else if (user.getRole() == User.Role.ADMIN) {
            Academy academy = academyRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new IllegalStateException("No academy found for user"));
            academyId = academy.getId();
            academyName = academy.getName();
        } else {
            // Staff user: look up academy by academyId stored on user
            Academy academy = academyRepository.findById(user.getAcademyId())
                    .orElseThrow(() -> new IllegalStateException("Academy not found"));
            academyId = academy.getId();
            academyName = academy.getName();
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new LoginResponse(token, user.getEmail(), academyId, academyName, user.getRole().name());
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.ADMIN)
                .build();

        user = userRepository.save(user);

        Academy academy = Academy.builder()
                .user(user)
                .name(request.getAcademyName())
                .description(request.getDescription())
                .address(request.getAddress())
                .phone(request.getPhone())
                .build();

        academy = academyRepository.save(academy);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());

        return new LoginResponse(token, user.getEmail(), academy.getId(), academy.getName(), user.getRole().name());
    }
}
