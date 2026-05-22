package com.jjplatform.api.service;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.BeltPromotion;
import com.jjplatform.api.model.BeltPromotion.PromotionType;
import com.jjplatform.api.model.DisciplineBelt;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.BeltPromotionRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BeltPromotionService {

    private static final List<String> DEFAULT_BELT_ORDER = List.of(
            "Blanco", "Gris", "Amarillo", "Naranja", "Verde", "Azul", "Morado", "Café", "Negro"
    );

    private final BeltPromotionRepository beltPromotionRepository;
    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;
    private final SecurityHelper securityHelper;

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<BeltPromotionDto> getByStudent(Long studentId, Long academyId) {
        return beltPromotionRepository
                .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(studentId, academyId)
                .stream()
                .filter(p -> p.getStudentDiscipline() == null) // global only
                .map(this::toDto).toList();
    }

    public List<BeltPromotionDto> getByStudentDiscipline(Long studentDisciplineId) {
        return beltPromotionRepository
                .findByStudentDisciplineIdOrderByPromotionDateAscIdAsc(studentDisciplineId)
                .stream().map(this::toDto).toList();
    }

    public List<BeltPromotionDto> getAll(Long academyId) {
        return beltPromotionRepository
                .findByAcademyIdOrderByStudentNameAscPromotionDateDesc(academyId)
                .stream().map(this::toDto).toList();
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public BeltPromotionDto create(BeltPromotionDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (!student.getAcademy().getId().equals(academyId))
            throw new ResourceNotFoundException("Student not found in this academy");

        StudentDiscipline sd = null;
        if (dto.getStudentDisciplineId() != null) {
            sd = studentDisciplineRepository.findById(dto.getStudentDisciplineId())
                    .orElseThrow(() -> new ResourceNotFoundException("StudentDiscipline not found"));
        }

        List<String> beltOrder  = resolveBeltOrder(sd);
        String       fromBelt   = dto.getFromBelt();
        String       toBelt     = dto.getToBelt();
        int          fromStripes = dto.getFromStripes() != null ? dto.getFromStripes() : 0;
        int          toStripes   = dto.getToStripes()   != null ? dto.getToStripes()   : 0;

        PromotionType type      = detectType(fromBelt, toBelt, beltOrder);
        boolean       deletable = type != PromotionType.DEGRADACION;
        String        performedBy = securityHelper.getCurrentUser().getEmail();

        BeltPromotion promotion = BeltPromotion.builder()
                .student(student)
                .academy(academy)
                .studentDiscipline(sd)
                .type(type)
                .fromBelt(fromBelt)
                .fromStripes(fromStripes)
                .toBelt(toBelt)
                .toStripes(toStripes)
                .promotionDate(LocalDate.parse(dto.getPromotionDate()))
                .notes(dto.getNotes())
                .performedBy(performedBy)
                .deletable(deletable)
                .build();

        if (sd != null) {
            sd.setBelt(toBelt);
            sd.setStripes(toStripes);
            studentDisciplineRepository.save(sd);
            // Keep student.belt in sync so list views and exports reflect the latest belt
            student.setBelt(toBelt);
            student.setStripes(toStripes);
            studentRepository.save(student);
        } else {
            student.setBelt(toBelt);
            student.setStripes(toStripes);
            studentRepository.save(student);
        }

        return toDto(beltPromotionRepository.save(promotion));
    }

    // ── Anular ────────────────────────────────────────────────────────────────

    @Transactional
    public BeltPromotionDto anular(Long id, Long academyId, String reason) {
        BeltPromotion promotion = beltPromotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
        if (!promotion.getAcademy().getId().equals(academyId))
            throw new ResourceNotFoundException("Promotion not found in this academy");
        if (Boolean.FALSE.equals(promotion.getDeletable()))
            throw new IllegalArgumentException("Este registro no puede anularse");
        if (Boolean.TRUE.equals(promotion.getDeleted()))
            throw new IllegalArgumentException("Este registro ya fue anulado");

        String    performedBy = securityHelper.getCurrentUser().getEmail();
        LocalDate now         = LocalDate.now();

        promotion.setDeleted(true);
        promotion.setDeletedBy(performedBy);
        promotion.setDeletedReason(reason);
        promotion.setDeletedAt(now);
        beltPromotionRepository.save(promotion);

        StudentDiscipline sd     = promotion.getStudentDiscipline();
        Student           student = promotion.getStudent();

        if (sd != null) {
            if (promotion.getType() == PromotionType.PROMOCION) {
                beltPromotionRepository
                        .findByStudentDisciplineIdOrderByPromotionDateAscIdAsc(sd.getId())
                        .stream()
                        .filter(p -> !Boolean.TRUE.equals(p.getDeleted())
                                && p.getType() == PromotionType.GRADO
                                && promotion.getToBelt().equals(p.getToBelt())
                                && !p.getPromotionDate().isBefore(promotion.getPromotionDate()))
                        .forEach(p -> {
                            p.setDeleted(true);
                            p.setDeletedBy(performedBy);
                            p.setDeletedReason("Cascada: anulación de promoción a " + promotion.getToBelt());
                            p.setDeletedAt(now);
                            beltPromotionRepository.save(p);
                        });
            }
            recomputeDisciplineBelt(sd);
        } else {
            if (promotion.getType() == PromotionType.PROMOCION) {
                beltPromotionRepository
                        .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(student.getId(), academyId)
                        .stream()
                        .filter(p -> !Boolean.TRUE.equals(p.getDeleted())
                                && p.getStudentDiscipline() == null
                                && p.getType() == PromotionType.GRADO
                                && promotion.getToBelt().equals(p.getToBelt())
                                && !p.getPromotionDate().isBefore(promotion.getPromotionDate()))
                        .forEach(p -> {
                            p.setDeleted(true);
                            p.setDeletedBy(performedBy);
                            p.setDeletedReason("Cascada: anulación de promoción a " + promotion.getToBelt());
                            p.setDeletedAt(now);
                            beltPromotionRepository.save(p);
                        });
            }

            List<BeltPromotion> active = beltPromotionRepository
                    .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(student.getId(), academyId)
                    .stream()
                    .filter(p -> !Boolean.TRUE.equals(p.getDeleted()) && p.getStudentDiscipline() == null)
                    .toList();

            if (active.isEmpty()) {
                student.setBelt(null);
                student.setStripes(0);
            } else {
                BeltPromotion last = active.get(0);
                student.setBelt(last.getToBelt());
                student.setStripes(last.getToStripes() != null ? last.getToStripes() : 0);
            }
            studentRepository.save(student);
        }

        return toDto(promotion);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void recomputeDisciplineBelt(StudentDiscipline sd) {
        List<BeltPromotion> active = beltPromotionRepository
                .findByStudentDisciplineIdOrderByPromotionDateAscIdAsc(sd.getId())
                .stream().filter(p -> !Boolean.TRUE.equals(p.getDeleted())).toList();
        if (active.isEmpty()) {
            sd.setBelt(null);
            sd.setStripes(0);
        } else {
            BeltPromotion last = active.get(active.size() - 1);
            sd.setBelt(last.getToBelt());
            sd.setStripes(last.getToStripes() != null ? last.getToStripes() : 0);
        }
        studentDisciplineRepository.save(sd);
        // Sync student.belt when result is non-null so list views stay current
        if (sd.getBelt() != null) {
            Student student = sd.getStudent();
            student.setBelt(sd.getBelt());
            student.setStripes(sd.getStripes());
            studentRepository.save(student);
        }
    }

    private List<String> resolveBeltOrder(StudentDiscipline sd) {
        if (sd == null || sd.getAgeCategory() == null) return DEFAULT_BELT_ORDER;
        List<String> order = sd.getAgeCategory().getBelts().stream()
                .sorted(Comparator.comparingInt(DisciplineBelt::getDisplayOrder))
                .map(DisciplineBelt::getName)
                .toList();
        return order.isEmpty() ? DEFAULT_BELT_ORDER : order;
    }

    private PromotionType detectType(String fromBelt, String toBelt, List<String> beltOrder) {
        if (fromBelt != null && fromBelt.equals(toBelt)) return PromotionType.GRADO;
        int fromIdx = fromBelt != null ? beltOrder.indexOf(fromBelt) : -1;
        int toIdx   = toBelt   != null ? beltOrder.indexOf(toBelt)   : -1;
        return fromIdx < toIdx ? PromotionType.PROMOCION : PromotionType.DEGRADACION;
    }

    private BeltPromotionDto toDto(BeltPromotion p) {
        BeltPromotionDto dto = new BeltPromotionDto();
        dto.setId(p.getId());
        dto.setStudentId(p.getStudent().getId());
        dto.setStudentName(p.getStudent().getName());
        dto.setStudentPhotoUrl(p.getStudent().getPhotoUrl());
        dto.setType(p.getType().name());
        dto.setFromBelt(p.getFromBelt());
        dto.setFromStripes(p.getFromStripes());
        dto.setToBelt(p.getToBelt());
        dto.setToStripes(p.getToStripes());
        dto.setPromotionDate(p.getPromotionDate().toString());
        dto.setNotes(p.getNotes());
        dto.setPerformedBy(p.getPerformedBy());
        dto.setDeletable(p.getDeletable());
        dto.setDeleted(p.getDeleted());
        dto.setDeletedBy(p.getDeletedBy());
        dto.setDeletedReason(p.getDeletedReason());
        dto.setDeletedAt(p.getDeletedAt() != null ? p.getDeletedAt().toString() : null);
        if (p.getStudentDiscipline() != null) {
            dto.setStudentDisciplineId(p.getStudentDiscipline().getId());
            dto.setDisciplineName(p.getStudentDiscipline().getDiscipline().getName());
        }
        return dto;
    }
}
