package com.jjplatform.api.service;

import com.jjplatform.api.config.JwtUtil;
import com.jjplatform.api.dto.ChangePasswordRequest;
import com.jjplatform.api.dto.LoginRequest;
import com.jjplatform.api.dto.LoginResponse;
import com.jjplatform.api.dto.RegisterRequest;
import com.jjplatform.api.dto.StudentRegisterRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RNG = new SecureRandom();
    // Avoids ambiguous chars (0/O, 1/l/I) so users can read the temp password from their email.
    private static final String TEMP_PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    private final UserRepository userRepository;
    private final AcademyRepository academyRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DefaultDisciplineService defaultDisciplineService;
    private final EmailService emailService;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        boolean mustChange = Boolean.TRUE.equals(user.getMustChangePassword());
        Long academyId;
        String academyName;
        if (user.getRole() == User.Role.SUPER_ADMIN || user.getRole() == User.Role.STUDENT) {
            // Super admins have no academy of their own; students may span several and pick inside the portal
            String token = jwtUtil.generateToken(user.getEmail(), user.getId());
            return new LoginResponse(token, user.getEmail(), null, null, user.getRole().name(), mustChange);
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
        return new LoginResponse(token, user.getEmail(), academyId, academyName, user.getRole().name(), mustChange);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("La contraseña actual es incorrecta");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new IllegalArgumentException("La nueva contraseña debe ser distinta a la actual");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase())
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

        defaultDisciplineService.createJiuJitsuIfAbsent(academy);
        defaultDisciplineService.createKickboxingIfAbsent(academy);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());

        return new LoginResponse(token, user.getEmail(), academy.getId(), academy.getName(), user.getRole().name(), false);
    }

    /**
     * Self-registration for an existing student. Validates that at least one student record matches the
     * supplied RUT + email, links every matching record (across academies) to a single STUDENT login,
     * and emails a temporary password. The person logs in once and switches academies inside the portal.
     *
     * <p>Re-running with the same data acts as "recover access / link new academy": it links any newly
     * matching records and re-issues a temporary password. The RUT + email pair is the trust boundary,
     * identical to the initial registration.
     */
    @Transactional
    public void registerStudent(StudentRegisterRequest request) {
        String normalizedRut = normalizeRut(request.getRut());
        String email = request.getEmail().trim().toLowerCase();

        // Match on email at the DB level, then compare RUT after normalizing both sides so the
        // stored format (dots, dash, lower/upper K) doesn't matter.
        List<Student> matches = studentRepository.findByEmailIgnoreCase(email).stream()
                .filter(s -> normalizeRut(s.getRut()).equals(normalizedRut))
                .toList();
        if (normalizedRut.isEmpty() || matches.isEmpty()) {
            throw new IllegalArgumentException(
                    "No encontramos un alumno con ese RUT y correo en la plataforma. Verifica los datos o contacta a tu academia.");
        }

        String tempPassword = generateTempPassword(12);
        linkStudentsToLogin(matches, email, tempPassword);

        emailService.sendStudentWelcomeEmail(email, tempPassword,
                matches.get(0).getName(), matches.get(0).getAcademy().getName());
    }

    /**
     * Forgot-password: verifies the RUT + email against an existing student record (same trust
     * boundary as self-registration) and, if it matches, issues a fresh temporary password and
     * emails it, flagging the account to change it on next login.
     *
     * <p>Requiring both the RUT and the email means a leaked email alone can't trigger a reset.
     * If no student matches, it throws the same error as registration so the user can fix the data.
     * If the email send fails, the surrounding transaction rolls back the password change so the
     * user is never left locked out with a temp password they never received.
     */
    @Transactional
    public void requestPasswordReset(String rawRut, String rawEmail) {
        String normalizedRut = normalizeRut(rawRut);
        String email = rawEmail.trim().toLowerCase();

        List<Student> matches = studentRepository.findByEmailIgnoreCase(email).stream()
                .filter(s -> normalizeRut(s.getRut()).equals(normalizedRut))
                .toList();
        if (normalizedRut.isEmpty() || matches.isEmpty()) {
            throw new IllegalArgumentException(
                    "No encontramos un alumno con ese RUT y correo en la plataforma. Verifica los datos o contacta a tu academia.");
        }

        String tempPassword = generateTempPassword(12);
        linkStudentsToLogin(matches, email, tempPassword);

        Student first = matches.get(0);
        emailService.sendPasswordResetEmail(email, tempPassword, first.getName(),
                first.getAcademy() != null ? first.getAcademy().getName() : null);
    }

    /**
     * Resolves the single STUDENT login for a set of matched student records and (re)issues the
     * given temporary password, then links every matched record to that one login.
     *
     * <p>Crucially it respects the EXISTING link first: if any matched record already belongs to a
     * login, that login IS the account — we only sync its email to the current value (the student's
     * email may have been changed by staff) instead of creating a second, student-less login.
     * Otherwise we reuse a login that already has this email, or create one.
     *
     * <p>This is the fix for the bug where changing a student's email and then resetting the
     * password produced a duplicate login with no student attached, so the portal — which resolves
     * the student by the login's user id — reported "el correo no está asociado a un alumno".
     */
    private void linkStudentsToLogin(List<Student> matches, String email, String tempPassword) {
        User user = matches.stream()
                .map(Student::getUser)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);

        if (user != null) {
            // Existing account: bring its login email in line with the student's current email,
            // unless that email already belongs to a different account.
            final User linked = user;
            if (!linked.getEmail().equalsIgnoreCase(email)) {
                userRepository.findByEmail(email)
                        .filter(other -> !other.getId().equals(linked.getId()))
                        .ifPresent(other -> { throw new IllegalArgumentException(
                                "El correo '" + email + "' ya pertenece a otra cuenta. Contacta a tu academia."); });
                linked.setEmail(email);
            }
        } else {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null && user.getRole() != User.Role.STUDENT) {
                throw new IllegalArgumentException(
                        "El correo '" + email + "' ya está en uso por una cuenta del sistema. Contacta a tu academia.");
            }
            if (user == null) {
                user = User.builder().email(email).role(User.Role.STUDENT).build();
            }
        }

        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        final User saved = userRepository.save(user);

        // Link/relink every matched record to this single login.
        matches.forEach(s -> {
            if (s.getUser() == null || !s.getUser().getId().equals(saved.getId())) {
                s.setUser(saved);
                studentRepository.save(s);
            }
        });
    }

    /**
     * Normalizes a Chilean RUT for comparison: drops dots, dash and any other separators, and upper-cases
     * the verifier "K". Returns "" for null/blank so it never matches a real RUT.
     */
    private static String normalizeRut(String rut) {
        if (rut == null) return "";
        return rut.replaceAll("[^0-9kK]", "").toUpperCase();
    }

    private static String generateTempPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RNG.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
