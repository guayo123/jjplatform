package com.jjplatform.api.service;

import com.jjplatform.api.dto.ProfessorDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfessorService {

    private final ProfessorRepository professorRepository;
    private final AcademyRepository academyRepository;

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

        Professor p = Professor.builder()
                .academy(academy)
                .name(dto.getName())
                .photoUrl(dto.getPhotoUrl())
                .bio(dto.getBio())
                .achievements(dto.getAchievements())
                .belt(dto.getBelt())
                .displayOrder(dto.getDisplayOrder())
                .active(true)
                .build();

        return toDto(professorRepository.save(p));
    }

    @Transactional
    public ProfessorDto update(Long id, ProfessorDto dto, Long academyId) {
        Professor p = findAndVerify(id, academyId);

        p.setName(dto.getName());
        p.setPhotoUrl(dto.getPhotoUrl());
        p.setBio(dto.getBio());
        p.setAchievements(dto.getAchievements());
        p.setBelt(dto.getBelt());
        p.setDisplayOrder(dto.getDisplayOrder());
        if (dto.getActive() != null) p.setActive(dto.getActive());

        return toDto(professorRepository.save(p));
    }

    @Transactional
    public void delete(Long id, Long academyId) {
        Professor p = findAndVerify(id, academyId);
        p.setActive(false);
        professorRepository.save(p);
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
        dto.setBelt(p.getBelt());
        dto.setDisplayOrder(p.getDisplayOrder());
        dto.setActive(p.getActive());
        return dto;
    }
}
