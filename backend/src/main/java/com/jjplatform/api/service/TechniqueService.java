package com.jjplatform.api.service;

import com.jjplatform.api.dto.TechniqueBeltGroupDto;
import com.jjplatform.api.dto.TechniqueCurriculumDto;
import com.jjplatform.api.dto.TechniqueDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.DisciplineAgeCategory;
import com.jjplatform.api.model.DisciplineBelt;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.model.StudentTechnique;
import com.jjplatform.api.model.Technique;
import com.jjplatform.api.repository.DisciplineAgeCategoryRepository;
import com.jjplatform.api.repository.DisciplineBeltRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentTechniqueRepository;
import com.jjplatform.api.repository.TechniqueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Technique-curriculum logic. Admin/staff build a per-belt program; students read the
 * program for the disciplines they train and tick off what they've learned.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TechniqueService {

    private final TechniqueRepository techniqueRepository;
    private final DisciplineBeltRepository beltRepository;
    private final DisciplineAgeCategoryRepository categoryRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;
    private final StudentTechniqueRepository studentTechniqueRepository;
    private final SecurityHelper securityHelper;

    // ── Admin / staff CRUD ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TechniqueDto> listByBelt(Long beltId) {
        requireOwnedBelt(beltId);
        return techniqueRepository.findByDisciplineBeltIdOrderByDisplayOrderAsc(beltId)
                .stream().map(t -> toDto(t, null)).toList();
    }

    public TechniqueDto create(Long beltId, TechniqueRequest req) {
        DisciplineBelt belt = requireOwnedBelt(beltId);
        Technique t = Technique.builder()
                .disciplineBelt(belt)
                .name(req.name().trim())
                .description(blankToNull(req.description()))
                .position(blankToNull(req.position()))
                .videoUrl(blankToNull(req.videoUrl()))
                .displayOrder((int) techniqueRepository.countByDisciplineBeltId(beltId))
                .active(true)
                .build();
        return toDto(techniqueRepository.save(t), null);
    }

    public TechniqueDto update(Long techniqueId, TechniqueRequest req) {
        Technique t = requireOwnedTechnique(techniqueId);
        t.setName(req.name().trim());
        t.setDescription(blankToNull(req.description()));
        t.setPosition(blankToNull(req.position()));
        t.setVideoUrl(blankToNull(req.videoUrl()));
        return toDto(techniqueRepository.save(t), null);
    }

    public void delete(Long techniqueId) {
        Technique t = requireOwnedTechnique(techniqueId);
        studentTechniqueRepository.deleteByTechniqueId(techniqueId);
        techniqueRepository.delete(t);
    }

    // ── Student portal ────────────────────────────────────────────────────────

    /**
     * Builds the technique curriculum for every discipline the student trains. For each
     * discipline we use the student's age category (falling back to the discipline's first
     * category) and list every belt's techniques, flagging which the student has learned and
     * which belts they've already reached.
     */
    @Transactional(readOnly = true)
    public List<TechniqueCurriculumDto> getCurriculum(Student student) {
        Set<Long> learnedIds = studentTechniqueRepository.findByStudentId(student.getId()).stream()
                .map(st -> st.getTechnique().getId())
                .collect(Collectors.toSet());

        List<TechniqueCurriculumDto> out = new ArrayList<>();
        for (StudentDiscipline sd : studentDisciplineRepository.findByStudentIdOrderByCreatedAtAsc(student.getId())) {
            if (Boolean.FALSE.equals(sd.getActive())) continue;
            DisciplineAgeCategory category = resolveCategory(sd);
            if (category == null) continue;

            List<DisciplineBelt> belts = category.getBelts(); // @OrderBy displayOrder ASC
            int currentOrder = currentBeltOrder(belts, sd.getBelt());

            List<TechniqueBeltGroupDto> groups = new ArrayList<>();
            int total = 0, learned = 0;
            for (DisciplineBelt belt : belts) {
                List<Technique> techs = techniqueRepository
                        .findByDisciplineBeltIdAndActiveTrueOrderByDisplayOrderAsc(belt.getId());
                if (techs.isEmpty()) continue;

                List<TechniqueDto> techDtos = new ArrayList<>();
                int groupLearned = 0;
                for (Technique t : techs) {
                    boolean isLearned = learnedIds.contains(t.getId());
                    if (isLearned) groupLearned++;
                    techDtos.add(toDto(t, isLearned));
                }
                total += techs.size();
                learned += groupLearned;

                groups.add(TechniqueBeltGroupDto.builder()
                        .beltId(belt.getId())
                        .beltName(belt.getName())
                        .beltColorHex(belt.getColorHex())
                        .displayOrder(belt.getDisplayOrder())
                        .current(currentOrder >= 0 && belt.getDisplayOrder() == currentOrder)
                        .reached(currentOrder >= 0 && belt.getDisplayOrder() <= currentOrder)
                        .totalCount(techs.size())
                        .learnedCount(groupLearned)
                        .techniques(techDtos)
                        .build());
            }

            if (groups.isEmpty()) continue; // no program configured for this discipline yet

            out.add(TechniqueCurriculumDto.builder()
                    .disciplineId(sd.getDiscipline().getId())
                    .disciplineName(sd.getDiscipline().getName())
                    .ageCategoryName(category.getName())
                    .currentBelt(sd.getBelt())
                    .totalCount(total)
                    .learnedCount(learned)
                    .belts(groups)
                    .build());
        }
        return out;
    }

    /** Marks (or unmarks) a technique learned for the student. Idempotent. */
    public void setLearned(Student student, Long techniqueId, boolean learned) {
        Technique technique = techniqueRepository.findById(techniqueId)
                .orElseThrow(() -> new ResourceNotFoundException("Técnica no encontrada"));
        // The technique must belong to a discipline the student trains.
        Long disciplineId = technique.getDisciplineBelt().getCategory().getDiscipline().getId();
        if (!studentDisciplineRepository.existsByStudentIdAndDisciplineId(student.getId(), disciplineId)) {
            throw new ResourceNotFoundException("Técnica no encontrada");
        }
        boolean exists = studentTechniqueRepository.existsByStudentIdAndTechniqueId(student.getId(), techniqueId);
        if (learned && !exists) {
            studentTechniqueRepository.save(StudentTechnique.builder()
                    .student(student)
                    .technique(technique)
                    .learnedAt(LocalDate.now())
                    .build());
        } else if (!learned && exists) {
            studentTechniqueRepository.deleteByStudentIdAndTechniqueId(student.getId(), techniqueId);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** The student's chosen age category, or the discipline's first category as a fallback. */
    private DisciplineAgeCategory resolveCategory(StudentDiscipline sd) {
        if (sd.getAgeCategory() != null) return sd.getAgeCategory();
        return categoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(sd.getDiscipline().getId())
                .stream().findFirst().orElse(null);
    }

    /** displayOrder of the belt matching the student's current belt name, or -1 when unknown. */
    private int currentBeltOrder(List<DisciplineBelt> belts, String currentBeltName) {
        if (currentBeltName == null) return -1;
        return belts.stream()
                .filter(b -> b.getName().equalsIgnoreCase(currentBeltName.trim()))
                .map(DisciplineBelt::getDisplayOrder)
                .findFirst().orElse(-1);
    }

    private DisciplineBelt requireOwnedBelt(Long beltId) {
        DisciplineBelt belt = beltRepository.findById(beltId)
                .orElseThrow(() -> new ResourceNotFoundException("Cinturón no encontrado"));
        verifyAcademy(belt);
        return belt;
    }

    private Technique requireOwnedTechnique(Long techniqueId) {
        Technique t = techniqueRepository.findById(techniqueId)
                .orElseThrow(() -> new ResourceNotFoundException("Técnica no encontrada"));
        verifyAcademy(t.getDisciplineBelt());
        return t;
    }

    private void verifyAcademy(DisciplineBelt belt) {
        Long academyId = belt.getCategory().getDiscipline().getAcademy().getId();
        if (!academyId.equals(securityHelper.getCurrentAcademyId())) {
            throw new ResourceNotFoundException("Cinturón no encontrado");
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private TechniqueDto toDto(Technique t, Boolean learned) {
        return TechniqueDto.builder()
                .id(t.getId())
                .beltId(t.getDisciplineBelt().getId())
                .name(t.getName())
                .description(t.getDescription())
                .position(t.getPosition())
                .videoUrl(t.getVideoUrl())
                .displayOrder(t.getDisplayOrder())
                .learned(learned)
                .build();
    }

    public record TechniqueRequest(String name, String description, String position, String videoUrl) {}
}
