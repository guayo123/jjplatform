package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.DisciplineAgeCategory;
import com.jjplatform.api.model.DisciplineBelt;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.repository.DisciplineAgeCategoryRepository;
import com.jjplatform.api.repository.DisciplineBeltRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DefaultDisciplineService {

    private static final Logger log = LoggerFactory.getLogger(DefaultDisciplineService.class);

    private final DisciplineRepository disciplineRepository;
    private final DisciplineAgeCategoryRepository disciplineAgeCategoryRepository;
    private final DisciplineBeltRepository disciplineBeltRepository;
    private final StudentRepository studentRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;

    /**
     * Ensures the "Jiu Jitsu" discipline exists for the given academy with its
     * standard age categories and belts configured.
     *
     * Three cases handled:
     *  1. Discipline does not exist → create it with both categories
     *  2. Discipline exists but has no age categories → add the missing categories
     *  3. Discipline exists and already has categories → no-op
     *
     * Idempotent — safe to call on every startup.
     */
    @Transactional
    public void createJiuJitsuIfAbsent(Academy academy) {
        Discipline jj = disciplineRepository
                .findByAcademyIdOrderByNameAsc(academy.getId())
                .stream()
                .filter(d -> "Jiu Jitsu".equalsIgnoreCase(d.getName()))
                .findFirst()
                .orElseGet(() -> disciplineRepository.save(
                        Discipline.builder()
                                .academy(academy)
                                .name("Jiu Jitsu")
                                .active(true)
                                .build()
                ));

        List<DisciplineAgeCategory> existing =
                disciplineAgeCategoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(jj.getId());

        boolean hasNinos   = existing.stream().anyMatch(c -> "Niños".equalsIgnoreCase(c.getName()));
        boolean hasAdultos = existing.stream().anyMatch(c -> "Adultos".equalsIgnoreCase(c.getName()));

        // ── Niños (4-15 años) ────────────────────────────────────────────────
        if (!hasNinos) {
            DisciplineAgeCategory ninos = disciplineAgeCategoryRepository.save(
                    DisciplineAgeCategory.builder()
                            .discipline(jj)
                            .name("Niños")
                            .minAge(4)
                            .maxAge(15)
                            .displayOrder(1)
                            .build()
            );
            saveBelts(ninos, List.of(
                    belt("Blanco",   "#F8F8F8", 1),
                    belt("Gris",     "#9CA3AF", 2),
                    belt("Amarillo", "#FCD34D", 3),
                    belt("Naranja",  "#F97316", 4),
                    belt("Verde",    "#22C55E", 5)
            ));
        }

        // ── Adultos (16+ años) — edades mínimas IBJJF ───────────────────────
        // Azul: 16 · Morado: 18 · Café: 19 · Negro: 19
        if (!hasAdultos) {
            DisciplineAgeCategory adultos = disciplineAgeCategoryRepository.save(
                    DisciplineAgeCategory.builder()
                            .discipline(jj)
                            .name("Adultos")
                            .minAge(16)
                            .maxAge(null)
                            .displayOrder(2)
                            .build()
            );
            saveBelts(adultos, List.of(
                    belt("Blanco",        "#F8F8F8", 1),
                    belt("Azul",          "#3B82F6", 2),
                    belt("Morado",        "#8B5CF6", 3),
                    belt("Café",          "#7C2D12", 4),
                    belt("Negro",         "#1F2937", 5),
                    belt("Rojo y Negro",  "#991B1B", 6),
                    belt("Rojo y Blanco", "#DC2626", 7),
                    belt("Rojo",          "#B91C1C", 8)
            ));
        }
    }

    /**
     * Ensures the "Kickboxing" discipline exists for the given academy with its
     * standard belt progression configured under a single "General" category.
     *
     * Idempotent — safe to call on every startup.
     */
    @Transactional
    public void createKickboxingIfAbsent(Academy academy) {
        Discipline kb = disciplineRepository
                .findByAcademyIdOrderByNameAsc(academy.getId())
                .stream()
                .filter(d -> "Kickboxing".equalsIgnoreCase(d.getName()))
                .findFirst()
                .orElseGet(() -> disciplineRepository.save(
                        Discipline.builder()
                                .academy(academy)
                                .name("Kickboxing")
                                .active(true)
                                .build()
                ));

        List<DisciplineAgeCategory> existing =
                disciplineAgeCategoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(kb.getId());

        boolean hasGeneral = existing.stream().anyMatch(c -> "General".equalsIgnoreCase(c.getName()));

        if (!hasGeneral) {
            DisciplineAgeCategory general = disciplineAgeCategoryRepository.save(
                    DisciplineAgeCategory.builder()
                            .discipline(kb)
                            .name("General")
                            .minAge(null)
                            .maxAge(null)
                            .displayOrder(1)
                            .build()
            );
            saveBelts(general, List.of(
                    belt("Blanco",   "#F8F8F8", 1),
                    belt("Amarillo", "#FCD34D", 2),
                    belt("Naranja",  "#F97316", 3),
                    belt("Verde",    "#22C55E", 4),
                    belt("Azul",     "#3B82F6", 5),
                    belt("Café",     "#7C2D12", 6),
                    belt("Negro",    "#1F2937", 7)
            ));
        }
    }

    /**
     * One-time backfill: for every student that still carries a legacy global
     * belt (Student.belt) but has no StudentDiscipline yet, creates a
     * StudentDiscipline under the academy's "Jiu Jitsu" discipline carrying
     * that belt and stripes. The age category is resolved from the belt name
     * first (the belt must belong to that category) and from the student's
     * age as a fallback.
     *
     * Idempotent — skips students that already have a Jiu Jitsu StudentDiscipline.
     * Safe to call on every startup.
     */
    @Transactional
    public void backfillJiuJitsuFromLegacyBelt(Academy academy) {
        Discipline jj = disciplineRepository
                .findByAcademyIdOrderByNameAsc(academy.getId())
                .stream()
                .filter(d -> "Jiu Jitsu".equalsIgnoreCase(d.getName()))
                .findFirst()
                .orElse(null);
        if (jj == null) return; // createJiuJitsuIfAbsent runs first; defensive

        List<DisciplineAgeCategory> categories =
                disciplineAgeCategoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(jj.getId());

        int migrated = 0;
        for (Student student : studentRepository.findByAcademyIdOrderByNameAsc(academy.getId())) {
            String belt = student.getBelt();
            if (belt == null || belt.isBlank()) continue;
            if (studentDisciplineRepository.existsByStudentIdAndDisciplineId(student.getId(), jj.getId()))
                continue;

            studentDisciplineRepository.save(
                    StudentDiscipline.builder()
                            .student(student)
                            .discipline(jj)
                            .ageCategory(resolveCategory(belt, student.getAge(), categories))
                            .belt(belt)
                            .stripes(student.getStripes() != null ? student.getStripes() : 0)
                            .joinDate(student.getJoinDate())
                            .active(true)
                            .build()
            );
            migrated++;
        }
        if (migrated > 0)
            log.info("Backfill: created {} Jiu Jitsu StudentDiscipline(s) for academy {}",
                    migrated, academy.getId());
    }

    /**
     * Picks the age category for a legacy belt. Prefers a category that both
     * configures that belt name and matches the student's age; falls back to
     * any category configuring the belt, then to age alone, then to the last
     * category (Adultos, which carries the broader belt set).
     */
    private DisciplineAgeCategory resolveCategory(String belt, Integer age,
                                                  List<DisciplineAgeCategory> categories) {
        if (categories.isEmpty()) return null;

        List<DisciplineAgeCategory> beltMatches = categories.stream()
                .filter(c -> c.getBelts().stream()
                        .anyMatch(b -> b.getName().equalsIgnoreCase(belt)))
                .toList();

        if (!beltMatches.isEmpty()) {
            return beltMatches.stream()
                    .filter(c -> ageInRange(age, c))
                    .findFirst()
                    .orElse(beltMatches.get(0));
        }

        return categories.stream()
                .filter(c -> ageInRange(age, c))
                .findFirst()
                .orElse(categories.get(categories.size() - 1));
    }

    private boolean ageInRange(Integer age, DisciplineAgeCategory c) {
        if (age == null) return false;
        if (c.getMinAge() != null && age < c.getMinAge()) return false;
        if (c.getMaxAge() != null && age > c.getMaxAge()) return false;
        return true;
    }

    private void saveBelts(DisciplineAgeCategory category, List<DisciplineBelt> belts) {
        belts.forEach(b -> {
            b.setCategory(category);
            disciplineBeltRepository.save(b);
        });
    }

    private DisciplineBelt belt(String name, String colorHex, int order) {
        return DisciplineBelt.builder()
                .name(name)
                .colorHex(colorHex)
                .displayOrder(order)
                .build();
    }
}
