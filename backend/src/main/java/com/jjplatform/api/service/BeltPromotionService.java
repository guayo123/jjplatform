package com.jjplatform.api.service;

import com.jjplatform.api.dto.BeltPromotionDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.BeltPromotion;
import com.jjplatform.api.model.BeltPromotion.PromotionType;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.BeltPromotionRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BeltPromotionService {

    private static final List<String> BELT_ORDER = List.of(
            "Blanco", "Gris", "Amarillo", "Naranja", "Verde", "Azul", "Morado", "Café", "Negro"
    );

    private final BeltPromotionRepository beltPromotionRepository;
    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;
    private final SecurityHelper securityHelper;

    public List<BeltPromotionDto> getByStudent(Long studentId, Long academyId) {
        return beltPromotionRepository
                .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(studentId, academyId)
                .stream().map(this::toDto).toList();
    }

    public List<BeltPromotionDto> getAll(Long academyId) {
        return beltPromotionRepository
                .findByAcademyIdOrderByStudentNameAscPromotionDateDesc(academyId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public BeltPromotionDto create(BeltPromotionDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (!student.getAcademy().getId().equals(academyId))
            throw new ResourceNotFoundException("Student not found in this academy");

        String fromBelt = dto.getFromBelt();
        String toBelt = dto.getToBelt();
        int fromStripes = dto.getFromStripes() != null ? dto.getFromStripes() : 0;
        int toStripes   = dto.getToStripes()   != null ? dto.getToStripes()   : 0;

        PromotionType type = detectType(fromBelt, toBelt);
        boolean deletable  = type != PromotionType.DEGRADACION;
        String performedBy = securityHelper.getCurrentUser().getEmail();

        BeltPromotion promotion = BeltPromotion.builder()
                .student(student)
                .academy(academy)
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

        student.setBelt(toBelt);
        student.setStripes(toStripes);
        studentRepository.save(student);

        return toDto(beltPromotionRepository.save(promotion));
    }

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

        String performedBy = securityHelper.getCurrentUser().getEmail();
        LocalDate now = LocalDate.now();

        promotion.setDeleted(true);
        promotion.setDeletedBy(performedBy);
        promotion.setDeletedReason(reason);
        promotion.setDeletedAt(now);
        beltPromotionRepository.save(promotion);

        Student student = promotion.getStudent();

        // Si se anula una PROMOCION de cinturón, anular en cascada los grados (rayas)
        // que se registraron sobre ese cinturón — ya no tienen base válida.
        if (promotion.getType() == PromotionType.PROMOCION) {
            beltPromotionRepository
                    .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(student.getId(), academyId)
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

        List<BeltPromotion> active = beltPromotionRepository
                .findByStudentIdAndAcademyIdOrderByPromotionDateDescIdDesc(student.getId(), academyId)
                .stream().filter(p -> !Boolean.TRUE.equals(p.getDeleted())).toList();

        if (active.isEmpty()) {
            student.setBelt(null);
            student.setStripes(0);
        } else {
            BeltPromotion last = active.get(0);
            student.setBelt(last.getToBelt());
            student.setStripes(last.getToStripes() != null ? last.getToStripes() : 0);
        }
        studentRepository.save(student);
        return toDto(promotion);
    }

    private PromotionType detectType(String fromBelt, String toBelt) {
        if (fromBelt != null && fromBelt.equals(toBelt)) return PromotionType.GRADO;
        int fromIdx = fromBelt != null ? BELT_ORDER.indexOf(fromBelt) : -1;
        int toIdx   = toBelt   != null ? BELT_ORDER.indexOf(toBelt)   : -1;
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
        return dto;
    }
}
