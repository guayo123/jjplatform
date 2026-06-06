package com.jjplatform.api.service;

import com.jjplatform.api.dto.ProfessorDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.AcademyStaff;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.AcademyStaffRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfessorService {

    private static final SecureRandom RNG = new SecureRandom();
    private static final String TEMP_PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    private final ProfessorRepository professorRepository;
    private final AcademyRepository academyRepository;
    private final StudentRepository studentRepository;
    private final DisciplineRepository disciplineRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;
    private final UserRepository userRepository;
    private final AcademyStaffRepository academyStaffRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public List<ProfessorDto> getByAcademy(Long academyId) {
        return professorRepository.findByAcademyIdOrderByDisplayOrderAscNameAsc(academyId)
                .stream().map(this::toDto).toList();
    }

    public ProfessorDto getOne(Long id, Long academyId) {
        return toDto(findAndVerify(id, academyId));
    }

    @Transactional
    public ProfessorDto create(ProfessorDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Discipline discipline = requireDiscipline(dto.getDisciplineId(), academyId);
        Student student = resolveOrCreateShellStudent(dto.getStudentId(), dto.getName(), academy);
        ensureStudentDiscipline(student, discipline);

        Professor p = Professor.builder()
                .academy(academy)
                .name(dto.getName())
                .photoUrl(dto.getPhotoUrl())
                .bio(dto.getBio())
                .achievements(dto.getAchievements())
                .displayOrder(dto.getDisplayOrder())
                .active(true)
                .student(student)
                .discipline(discipline)
                .email(normalizeEmail(dto.getEmail()))
                .build();

        return toDto(professorRepository.save(p));
    }

    @Transactional
    public ProfessorDto update(Long id, ProfessorDto dto, Long academyId) {
        Professor p = findAndVerify(id, academyId);
        Academy academy = p.getAcademy();

        Discipline discipline = requireDiscipline(dto.getDisciplineId(), academyId);
        Student student = resolveOrCreateShellStudent(dto.getStudentId(), dto.getName(), academy);
        ensureStudentDiscipline(student, discipline);

        p.setName(dto.getName());
        p.setPhotoUrl(dto.getPhotoUrl());
        p.setBio(dto.getBio());
        p.setAchievements(dto.getAchievements());
        p.setDisplayOrder(dto.getDisplayOrder());
        if (dto.getActive() != null) p.setActive(dto.getActive());
        p.setStudent(student);
        p.setDiscipline(discipline);
        p.setEmail(normalizeEmail(dto.getEmail()));

        return toDto(professorRepository.save(p));
    }

    /**
     * Creates a system login account for this professor with a temporary password and emails the credentials.
     * The professor's own email is used; if absent, falls back to the linked student's email.
     */
    @Transactional
    public ProfessorDto grantAccess(Long professorId, Long academyId) {
        Professor p = findAndVerify(professorId, academyId);

        if (p.getUser() != null) {
            throw new IllegalArgumentException("Este profesor ya tiene una cuenta de acceso. Usa 'Reenviar clave' si necesita una nueva.");
        }

        String email = resolveEmail(p);
        if (email == null) {
            throw new IllegalArgumentException("El profesor no tiene email. Agrega uno antes de crear la cuenta.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Ya existe un usuario con el correo '" + email + "'.");
        }

        String tempPassword = generateTempPassword(12);
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(tempPassword))
                .role(User.Role.PROFESOR)
                .academyId(academyId)
                .mustChangePassword(true)
                .build();
        user = userRepository.save(user);

        academyStaffRepository.save(AcademyStaff.builder()
                .academyId(academyId)
                .userId(user.getId())
                .active(true)
                .build());

        p.setUser(user);
        professorRepository.save(p);

        emailService.sendStaffWelcomeEmail(email, tempPassword, "PROFESOR", p.getAcademy().getName());
        return toDto(p);
    }

    /**
     * Regenerates a fresh temporary password for an existing professor account and re-sends the welcome email.
     */
    @Transactional
    public ProfessorDto resendCredentials(Long professorId, Long academyId) {
        Professor p = findAndVerify(professorId, academyId);
        User user = p.getUser();
        if (user == null) {
            throw new IllegalArgumentException("Este profesor todavía no tiene una cuenta. Crea el acceso primero.");
        }

        String tempPassword = generateTempPassword(12);
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);

        emailService.sendStaffWelcomeEmail(user.getEmail(), tempPassword, "PROFESOR", p.getAcademy().getName());
        return toDto(p);
    }

    private String resolveEmail(Professor p) {
        String own = normalizeEmail(p.getEmail());
        if (own != null) return own;
        if (p.getStudent() != null) {
            return normalizeEmail(p.getStudent().getEmail());
        }
        return null;
    }

    private static String normalizeEmail(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String generateTempPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RNG.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }

    @Transactional
    public void delete(Long id, Long academyId) {
        Professor p = findAndVerify(id, academyId);
        p.setActive(false);
        professorRepository.save(p);
    }

    /**
     * Returns the existing Student if studentId is provided, otherwise
     * creates a "shell" Student (active=false, no plans) that exists only
     * to hold the professor's belt history via StudentDiscipline.
     * The shell student is filtered out of the regular student list.
     */
    private Student resolveOrCreateShellStudent(Long studentId, String professorName, Academy academy) {
        if (studentId != null) {
            return studentRepository.findById(studentId)
                    .filter(s -> s.getAcademy().getId().equals(academy.getId()))
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found in this academy"));
        }
        Student shell = Student.builder()
                .academy(academy)
                .name(professorName)
                .active(false)
                .build();
        return studentRepository.save(shell);
    }

    /**
     * Ensures the student has a StudentDiscipline for the given discipline.
     * No-op if it already exists. Belt starts as null — admin must set it
     * via the existing belt-promotion UI on the student's detail page.
     */
    private void ensureStudentDiscipline(Student student, Discipline discipline) {
        if (studentDisciplineRepository.existsByStudentIdAndDisciplineId(student.getId(), discipline.getId())) {
            return;
        }
        StudentDiscipline sd = StudentDiscipline.builder()
                .student(student)
                .discipline(discipline)
                .stripes(0)
                .joinDate(LocalDate.now())
                .active(true)
                .build();
        studentDisciplineRepository.save(sd);
    }

    private Discipline requireDiscipline(Long disciplineId, Long academyId) {
        if (disciplineId == null) {
            throw new IllegalArgumentException("Discipline is required");
        }
        return disciplineRepository.findById(disciplineId)
                .filter(d -> d.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Discipline not found in this academy"));
    }

    private Professor findAndVerify(Long id, Long academyId) {
        Professor p = professorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Professor not found"));
        if (!p.getAcademy().getId().equals(academyId))
            throw new ResourceNotFoundException("Professor not found in this academy");
        return p;
    }

    private ProfessorDto toDto(Professor p) {
        ProfessorDto dto = new ProfessorDto();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setPhotoUrl(p.getPhotoUrl());
        dto.setBio(p.getBio());
        dto.setAchievements(p.getAchievements());
        dto.setDisplayOrder(p.getDisplayOrder());
        dto.setActive(p.getActive());
        dto.setEmail(p.getEmail());
        dto.setEffectiveEmail(resolveEmail(p));
        dto.setHasAccount(p.getUser() != null);
        if (p.getStudent() != null) {
            dto.setStudentId(p.getStudent().getId());
            dto.setStudentName(p.getStudent().getName());
        }
        if (p.getDiscipline() != null) {
            dto.setDisciplineId(p.getDiscipline().getId());
            dto.setDisciplineName(p.getDiscipline().getName());
            // Compute belt from the StudentDiscipline that matches the taught discipline
            if (p.getStudent() != null) {
                studentDisciplineRepository
                        .findByStudentIdAndDisciplineId(p.getStudent().getId(), p.getDiscipline().getId())
                        .ifPresent(sd -> dto.setBelt(sd.getBelt()));
            }
        }
        return dto;
    }
}
