package com.jjplatform.api.controller;

import com.jjplatform.api.dto.ChangePasswordRequest;
import com.jjplatform.api.dto.ForgotPasswordRequest;
import com.jjplatform.api.dto.LoginRequest;
import com.jjplatform.api.dto.LoginResponse;
import com.jjplatform.api.dto.RegisterRequest;
import com.jjplatform.api.dto.StudentRegisterRequest;
import com.jjplatform.api.model.User;
import com.jjplatform.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/student-register")
    public ResponseEntity<Void> registerStudent(@Valid @RequestBody StudentRegisterRequest request) {
        authService.registerStudent(request);
        return ResponseEntity.status(201).build();
    }

    /**
     * Forgot-password: verifies RUT + email against a student record and emails a fresh
     * temporary password. Returns 204 on success; 400 with a message if the data doesn't match.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getRut(), request.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // The JWT filter sets the User entity as the principal, so read the email from it directly
        // (auth.getName() would return the User's default toString, not the email).
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user)) {
            return ResponseEntity.status(401).build();
        }
        authService.changePassword(user.getEmail(), request);
        return ResponseEntity.noContent().build();
    }
}
