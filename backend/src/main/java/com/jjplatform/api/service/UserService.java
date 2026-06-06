package com.jjplatform.api.service;

import com.jjplatform.api.dto.CreateUserRequest;
import com.jjplatform.api.dto.UserDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.AcademyStaff;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.AcademyStaffRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final SecureRandom RNG = new SecureRandom();
    // Avoids ambiguous chars (0/O, 1/l/I) so users can read the temp password from their email.
    private static final String TEMP_PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    private final UserRepository userRepository;
    private final AcademyStaffRepository academyStaffRepository;
    private final AcademyRepository academyRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

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
        String email = request.getEmail().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            User existing = userRepository.findByEmail(email).get();

            if (existing.getRole() == User.Role.ADMIN || existing.getRole() == User.Role.SUPER_ADMIN) {
                throw new IllegalArgumentException(
                        "El correo '" + email + "' pertenece a un administrador y no puede asignarse como staff.");
            }

            if (academyStaffRepository.existsByAcademyIdAndUserId(academyId, existing.getId())) {
                throw new IllegalArgumentException(
                        "El correo '" + email + "' ya está registrado en esta academia.");
            }

            AcademyStaff staff = AcademyStaff.builder()
                    .academyId(academyId)
                    .userId(existing.getId())
                    .active(true)
                    .build();
            academyStaffRepository.save(staff);
            return new UserDto(existing.getId(), existing.getEmail(), existing.getRole().name(), true, existing.getCreatedAt());
        }

        String tempPassword = generateTempPassword(12);

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(tempPassword))
                .role(User.Role.valueOf(request.getRole()))
                .academyId(academyId)
                .mustChangePassword(true)
                .build();
        user = userRepository.save(user);

        AcademyStaff staff = AcademyStaff.builder()
                .academyId(academyId)
                .userId(user.getId())
                .active(true)
                .build();
        academyStaffRepository.save(staff);

        String academyName = academyRepository.findById(academyId).map(Academy::getName).orElse(null);
        emailService.sendStaffWelcomeEmail(email, tempPassword, request.getRole(), academyName);

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

    private static String generateTempPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RNG.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
