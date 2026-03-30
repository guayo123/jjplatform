package com.jjplatform.api.service;

import com.jjplatform.api.dto.CreateUserRequest;
import com.jjplatform.api.dto.UserDto;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> getUsersByAcademy(Long academyId) {
        return userRepository.findByAcademyId(academyId).stream()
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getRole().name(), u.getCreatedAt()))
                .toList();
    }

    public UserDto createStaffUser(CreateUserRequest request, Long academyId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.valueOf(request.getRole()))
                .academyId(academyId)
                .build();

        user = userRepository.save(user);
        return new UserDto(user.getId(), user.getEmail(), user.getRole().name(), user.getCreatedAt());
    }

    public void deleteStaffUser(Long userId, Long academyId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!academyId.equals(user.getAcademyId())) {
            throw new IllegalArgumentException("User does not belong to your academy");
        }
        userRepository.delete(user);
    }
}
