package com.jjplatform.api.service;

import com.jjplatform.api.dto.CreateUserRequest;
import com.jjplatform.api.dto.UserDto;
import com.jjplatform.api.model.AcademyStaff;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyStaffRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AcademyStaffRepository academyStaffRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> getUsersByAcademy(Long academyId) {
        return academyStaffRepository.findByAcademyId(academyId).stream()
                .map(staff -> {
                    User user = userRepository.findById(staff.getUserId())
                            .orElseThrow(() -> new IllegalStateException("User not found"));
                    return new UserDto(user.getId(), user.getEmail(), user.getRole().name(),
                            staff.getActive(), user.getCreatedAt());
                })
                .toList();
    }

    @Transactional
    public UserDto createStaffUser(CreateUserRequest request, Long academyId) {
        User user;

        if (userRepository.existsByEmail(request.getEmail())) {
            user = userRepository.findByEmail(request.getEmail()).get();

            // ADMIN / SUPER_ADMIN cannot be added as staff
            if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.SUPER_ADMIN) {
                throw new IllegalArgumentException(
                        "El correo '" + request.getEmail() + "' pertenece a un administrador y no puede asignarse como staff.");
            }

            // Already linked to this academy
            if (academyStaffRepository.existsByAcademyIdAndUserId(academyId, user.getId())) {
                throw new IllegalArgumentException(
                        "El correo '" + request.getEmail() + "' ya está registrado en esta academia.");
            }

            // Link existing user to this academy (multi-academy staff)
            AcademyStaff staff = AcademyStaff.builder()
                    .academyId(academyId)
                    .userId(user.getId())
                    .active(true)
                    .build();
            academyStaffRepository.save(staff);
            return new UserDto(user.getId(), user.getEmail(), user.getRole().name(), true, user.getCreatedAt());
        }

        // New user: create account and link to academy
        user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.valueOf(request.getRole()))
                .academyId(academyId)
                .build();
        user = userRepository.save(user);

        AcademyStaff staff = AcademyStaff.builder()
                .academyId(academyId)
                .userId(user.getId())
                .active(true)
                .build();
        academyStaffRepository.save(staff);

        return new UserDto(user.getId(), user.getEmail(), user.getRole().name(), true, user.getCreatedAt());
    }

    @Transactional
    public UserDto toggleActiveStaff(Long userId, Long academyId) {
        AcademyStaff staff = academyStaffRepository.findByAcademyIdAndUserId(academyId, userId)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no pertenece a esta academia."));
        staff.setActive(!staff.getActive());
        academyStaffRepository.save(staff);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        return new UserDto(user.getId(), user.getEmail(), user.getRole().name(), staff.getActive(), user.getCreatedAt());
    }
}

