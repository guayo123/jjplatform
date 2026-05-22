package com.jjplatform.api.service;

import com.jjplatform.api.dto.DisciplineAgeCategoryDto;
import com.jjplatform.api.dto.DisciplineBeltDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.DisciplineAgeCategory;
import com.jjplatform.api.model.DisciplineBelt;
import com.jjplatform.api.repository.DisciplineAgeCategoryRepository;
import com.jjplatform.api.repository.DisciplineBeltRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DisciplineBeltService {

    private final DisciplineRepository disciplineRepository;
    private final DisciplineAgeCategoryRepository categoryRepository;
    private final DisciplineBeltRepository beltRepository;

    public List<DisciplineAgeCategoryDto> getCategories(Long disciplineId) {
        return categoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(disciplineId)
                .stream().map(this::toDto).toList();
    }

    public DisciplineAgeCategoryDto createCategory(Long disciplineId, CategoryRequest req) {
        Discipline discipline = disciplineRepository.findById(disciplineId)
                .orElseThrow(() -> new ResourceNotFoundException("Discipline not found"));

        long count = categoryRepository.findByDisciplineIdOrderByDisplayOrderAsc(disciplineId).size();
        DisciplineAgeCategory cat = DisciplineAgeCategory.builder()
                .discipline(discipline)
                .name(req.name())
                .minAge(req.minAge())
                .maxAge(req.maxAge())
                .displayOrder((int) count)
                .build();
        return toDto(categoryRepository.save(cat));
    }

    public DisciplineAgeCategoryDto updateCategory(Long catId, CategoryRequest req) {
        DisciplineAgeCategory cat = categoryRepository.findById(catId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        cat.setName(req.name());
        cat.setMinAge(req.minAge());
        cat.setMaxAge(req.maxAge());
        return toDto(categoryRepository.save(cat));
    }

    public void deleteCategory(Long catId) {
        DisciplineAgeCategory cat = categoryRepository.findById(catId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        categoryRepository.delete(cat);
    }

    public DisciplineAgeCategoryDto addBelt(Long catId, BeltRequest req) {
        DisciplineAgeCategory cat = categoryRepository.findById(catId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        DisciplineBelt belt = DisciplineBelt.builder()
                .category(cat)
                .name(req.name())
                .colorHex(req.colorHex())
                .displayOrder(cat.getBelts().size())
                .build();
        beltRepository.save(belt);
        cat.getBelts().add(belt);
        return toDto(cat);
    }

    public DisciplineAgeCategoryDto updateBelt(Long beltId, BeltRequest req) {
        DisciplineBelt belt = beltRepository.findById(beltId)
                .orElseThrow(() -> new ResourceNotFoundException("Belt not found"));
        belt.setName(req.name());
        belt.setColorHex(req.colorHex());
        beltRepository.save(belt);
        return toDto(belt.getCategory());
    }

    public void deleteBelt(Long beltId) {
        DisciplineBelt belt = beltRepository.findById(beltId)
                .orElseThrow(() -> new ResourceNotFoundException("Belt not found"));
        DisciplineAgeCategory cat = belt.getCategory();
        cat.getBelts().remove(belt);
        // Re-assign display order
        for (int i = 0; i < cat.getBelts().size(); i++) {
            cat.getBelts().get(i).setDisplayOrder(i);
        }
        categoryRepository.save(cat);
    }

    public DisciplineAgeCategoryDto reorderBelts(Long catId, List<Long> orderedIds) {
        DisciplineAgeCategory cat = categoryRepository.findById(catId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        for (int i = 0; i < orderedIds.size(); i++) {
            final int order = i;
            cat.getBelts().stream()
                    .filter(b -> b.getId().equals(orderedIds.get(order)))
                    .findFirst()
                    .ifPresent(b -> b.setDisplayOrder(order));
        }
        return toDto(categoryRepository.save(cat));
    }

    private DisciplineAgeCategoryDto toDto(DisciplineAgeCategory cat) {
        DisciplineAgeCategoryDto dto = new DisciplineAgeCategoryDto();
        dto.setId(cat.getId());
        dto.setDisciplineId(cat.getDiscipline().getId());
        dto.setName(cat.getName());
        dto.setMinAge(cat.getMinAge());
        dto.setMaxAge(cat.getMaxAge());
        dto.setDisplayOrder(cat.getDisplayOrder());
        dto.setBelts(cat.getBelts().stream().map(this::toBeltDto).toList());
        return dto;
    }

    private DisciplineBeltDto toBeltDto(DisciplineBelt b) {
        DisciplineBeltDto dto = new DisciplineBeltDto();
        dto.setId(b.getId());
        dto.setName(b.getName());
        dto.setColorHex(b.getColorHex());
        dto.setDisplayOrder(b.getDisplayOrder());
        return dto;
    }

    public record CategoryRequest(String name, Integer minAge, Integer maxAge) {}
    public record BeltRequest(String name, String colorHex) {}
}
