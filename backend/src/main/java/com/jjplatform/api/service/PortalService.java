package com.jjplatform.api.service;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.dto.PaymentDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.User;
import com.jjplatform.api.repository.StudentRepository;
import com.jjplatform.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * Backs the student portal. Every method resolves the student from the supplied id and verifies it is
 * linked to the logged-in STUDENT user, so a student can only ever read/modify their own record(s),
 * never another student's by guessing an id.
 */
@Service
@RequiredArgsConstructor
public class PortalService {

    // Scenic (CSS/SVG) + photographic (served from the frontend /public/portadas) cover options.
    // Keep in sync with frontend portalBanners.tsx.
    private static final Set<String> ALLOWED_BANNERS = Set.of(
            "japones", "olas", "torii", "jiujitsu", "minimal",
            "samuraiwarrior", "mujer", "mujer2", "tiburon", "tortugasninjas");

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final StudentDisciplineService studentDisciplineService;
    private final BeltPromotionService beltPromotionService;
    private final PaymentService paymentService;
    private final FileStorageService fileStorageService;

    @Value("${app.base-url}")
    private String baseUrl;

    /** Current student's portal banner preference (null when none chosen). */
    public String getBanner() {
        return securityHelper.getCurrentUser().getPortalBanner();
    }

    /** Sets (or clears, with null/blank) the portal banner for the logged-in student. */
    @Transactional
    public String setBanner(String banner) {
        String value = (banner == null || banner.isBlank()) ? null : banner.trim().toLowerCase();
        if (value != null && !ALLOWED_BANNERS.contains(value)) {
            throw new IllegalArgumentException("Diseño de portada no válido.");
        }
        User user = userRepository.findById(securityHelper.getCurrentUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setPortalBanner(value);
        userRepository.save(user);
        return value;
    }

    /** Loads a student that must belong to the current portal user, or 404s. */
    private Student requireOwnedStudent(Long studentId) {
        Long userId = securityHelper.getCurrentUser().getId();
        Student s = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));
        if (s.getUser() == null || !s.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Alumno no encontrado");
        }
        return s;
    }

    public List<StudentDisciplineDto> getDisciplines(Long studentId) {
        requireOwnedStudent(studentId);
        return studentDisciplineService.getByStudent(studentId);
    }

    public List<BeltPromotionDto> getBeltPromotions(Long studentId) {
        Student s = requireOwnedStudent(studentId);
        return beltPromotionService.getAllByStudent(studentId, s.getAcademy().getId());
    }

    public List<PaymentDto> getPayments(Long studentId) {
        requireOwnedStudent(studentId);
        return paymentService.getPaymentsByStudent(studentId);
    }

    /** Stores a new profile photo for the owned student and returns its public URL. */
    @Transactional
    public String updatePhoto(Long studentId, MultipartFile file) throws IOException {
        Student s = requireOwnedStudent(studentId);

        String filename = fileStorageService.store(file, ImageValidator.Profile.PROFILE);
        String url = baseUrl + "/api/files/" + filename;

        String old = s.getPhotoUrl();
        if (old != null && old.contains("/api/files/")) {
            try {
                fileStorageService.delete(old.substring(old.lastIndexOf('/') + 1));
            } catch (IOException ignored) {
                // Old file may already be gone; the new photo is what matters.
            }
        }

        s.setPhotoUrl(url);
        studentRepository.save(s);
        return url;
    }
}
