package com.jjplatform.api.service;

import com.jjplatform.api.dto.AcademyAdminDto;
import com.jjplatform.api.dto.RegisterRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final AcademyRepository academyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AcademyAdminDto> listAllAcademies() {
        return academyRepository.findAll().stream()
                .map(a -> new AcademyAdminDto(
                        a.getId(),
                        a.getName(),
                        a.getDescription(),
                        a.getAddress(),
                        a.getPhone(),
                        a.getUser().getEmail(),
                        (int) a.getStudents().stream().filter(s -> Boolean.TRUE.equals(s.getActive())).count(),
                        Boolean.TRUE.equals(a.getActive()),
                        a.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public AcademyAdminDto createAcademy(RegisterRequest request) {
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

        return new AcademyAdminDto(
                academy.getId(),
                academy.getName(),
                academy.getDescription(),
                academy.getAddress(),
                academy.getPhone(),
                user.getEmail(),
                0,
                true,
                academy.getCreatedAt()
        );
    }

    @Transactional
    public AcademyAdminDto toggleAcademyActive(Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalArgumentException("Academy not found"));
        academy.setActive(!Boolean.TRUE.equals(academy.getActive()));
        academy = academyRepository.save(academy);

        return new AcademyAdminDto(
                academy.getId(),
                academy.getName(),
                academy.getDescription(),
                academy.getAddress(),
                academy.getPhone(),
                academy.getUser().getEmail(),
                (int) academy.getStudents().stream().filter(s -> Boolean.TRUE.equals(s.getActive())).count(),
                academy.getActive(),
                academy.getCreatedAt()
        );
    }
}
