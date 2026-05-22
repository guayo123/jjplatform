package com.jjplatform.api.service;

import com.jjplatform.api.dto.CompetitionResultDto;
import com.jjplatform.api.dto.StudentDisciplineDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.*;
import com.jjplatform.api.repository.*;
import com.jjplatform.api.model.DisciplineAgeCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentDisciplineService {

    private final StudentDisciplineRepository studentDisciplineRepository;
    private final CompetitionResultRepository competitionResultRepository;
    private final StudentRepository studentRepository;
    private final DisciplineRepository disciplineRepository;
    private final DisciplineAgeCategoryRepository disciplineAgeCategoryRepository;

    public List<StudentDisciplineDto> getByStudent(Long studentId) {
        return studentDisciplineRepository.findByStudentIdOrderByCreatedAtAsc(studentId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public StudentDisciplineDto addDiscipline(Long studentId, Long academyId, StudentDisciplineDto dto) {
        Student student = studentRepository.findById(studentId)
                .filter(s -> s.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));

        Discipline discipline = disciplineRepository.findById(dto.getDisciplineId())
                .filter(d -> d.getAcademy().getId().equals(academyId))
                .orElseThrow(() -> new ResourceNotFoundException("Disciplina no encontrada"));

        if (studentDisciplineRepository.existsByStudentIdAndDisciplineId(studentId, dto.getDisciplineId()))
            throw new IllegalStateException("El alumno ya está inscrito en esta disciplina");

        DisciplineAgeCategory ageCategory = null;
        if (dto.getAgeCategoryId() != null) {
            ageCategory = disciplineAgeCategoryRepository.findById(dto.getAgeCategoryId()).orElse(null);
        }

        StudentDiscipline sd = StudentDiscipline.builder()
                .student(student)
                .discipline(discipline)
                .ageCategory(ageCategory)
                .belt(dto.getBelt())
                .stripes(dto.getStripes() != null ? dto.getStripes() : 0)
                .joinDate(dto.getJoinDate())
                .active(true)
                .build();

        return toDto(studentDisciplineRepository.save(sd));
    }

    @Transactional
    public StudentDisciplineDto update(Long id, Long academyId, StudentDisciplineDto dto) {
        StudentDiscipline sd = findAndVerify(id, academyId);
        if (dto.getAgeCategoryId() != null) {
            sd.setAgeCategory(disciplineAgeCategoryRepository.findById(dto.getAgeCategoryId()).orElse(null));
        }
        if (dto.getBelt() != null) sd.setBelt(dto.getBelt());
        if (dto.getStripes() != null) sd.setStripes(dto.getStripes());
        if (dto.getJoinDate() != null) sd.setJoinDate(dto.getJoinDate());
        if (dto.getActive() != null) sd.setActive(dto.getActive());
        return toDto(studentDisciplineRepository.save(sd));
    }

    @Transactional
    public StudentDisciplineDto updateBelt(Long id, Long academyId, String belt, Integer stripes) {
        StudentDiscipline sd = findAndVerify(id, academyId);
        sd.setBelt(belt == null || belt.isBlank() ? null : belt);
        sd.setStripes(stripes != null ? stripes : 0);
        return toDto(studentDisciplineRepository.save(sd));
    }

    @Transactional
    public void delete(Long id, Long academyId) {
        studentDisciplineRepository.delete(findAndVerify(id, academyId));
    }

    // ── Competition Results ───────────────────────────────────────────────────

    @Transactional
    public CompetitionResultDto addResult(Long studentDisciplineId, Long academyId, CompetitionResultDto dto) {
        StudentDiscipline sd = findAndVerify(studentDisciplineId, academyId);

        // Snapshot belt: use provided value or fall back to current discipline belt
        String beltSnapshot   = dto.getBeltAtCompetition() != null ? dto.getBeltAtCompetition() : sd.getBelt();
        Integer stripesSnapshot = dto.getStripesAtCompetition() != null ? dto.getStripesAtCompetition() : (sd.getStripes() != null ? sd.getStripes() : 0);

        CompetitionResult result = CompetitionResult.builder()
                .studentDiscipline(sd)
                .tournamentName(dto.getTournamentName())
                .date(dto.getDate())
                .placement(dto.getPlacement())
                .category(dto.getCategory())
                .beltAtCompetition(beltSnapshot)
                .stripesAtCompetition(stripesSnapshot)
                .notes(dto.getNotes())
                .build();

        return toResultDto(competitionResultRepository.save(result));
    }

    @Transactional
    public CompetitionResultDto updateResult(Long resultId, Long academyId, CompetitionResultDto dto) {
        CompetitionResult result = competitionResultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Resultado no encontrado"));
        findAndVerify(result.getStudentDiscipline().getId(), academyId);

        if (dto.getTournamentName() != null) result.setTournamentName(dto.getTournamentName());
        if (dto.getDate() != null) result.setDate(dto.getDate());
        if (dto.getPlacement() != null) result.setPlacement(dto.getPlacement());
        if (dto.getCategory() != null) result.setCategory(dto.getCategory());
        if (dto.getNotes() != null) result.setNotes(dto.getNotes());

        return toResultDto(competitionResultRepository.save(result));
    }

    @Transactional
    public void deleteResult(Long resultId, Long academyId) {
        CompetitionResult result = competitionResultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Resultado no encontrado"));
        findAndVerify(result.getStudentDiscipline().getId(), academyId);
        competitionResultRepository.delete(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private StudentDiscipline findAndVerify(Long id, Long academyId) {
        StudentDiscipline sd = studentDisciplineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de disciplina no encontrada"));
        if (!sd.getStudent().getAcademy().getId().equals(academyId))
            throw new ResourceNotFoundException("No autorizado");
        return sd;
    }

    private StudentDisciplineDto toDto(StudentDiscipline sd) {
        StudentDisciplineDto dto = new StudentDisciplineDto();
        dto.setId(sd.getId());
        dto.setStudentId(sd.getStudent().getId());
        dto.setDisciplineId(sd.getDiscipline().getId());
        dto.setDisciplineName(sd.getDiscipline().getName());
        if (sd.getAgeCategory() != null) {
            dto.setAgeCategoryId(sd.getAgeCategory().getId());
            dto.setAgeCategoryName(sd.getAgeCategory().getName());
            // Resolve colorHex from the configured belt in this category
            sd.getAgeCategory().getBelts().stream()
                    .filter(b -> b.getName().equals(sd.getBelt()))
                    .findFirst()
                    .ifPresent(b -> dto.setBeltColorHex(b.getColorHex()));
        }
        dto.setBelt(sd.getBelt());
        dto.setStripes(sd.getStripes());
        dto.setJoinDate(sd.getJoinDate());
        dto.setActive(sd.getActive());
        dto.setCompetitionResults(
                competitionResultRepository.findByStudentDisciplineIdOrderByDateDesc(sd.getId())
                        .stream().map(this::toResultDto).toList()
        );
        return dto;
    }

    private CompetitionResultDto toResultDto(CompetitionResult r) {
        CompetitionResultDto dto = new CompetitionResultDto();
        dto.setId(r.getId());
        dto.setStudentDisciplineId(r.getStudentDiscipline().getId());
        dto.setTournamentName(r.getTournamentName());
        dto.setDate(r.getDate());
        dto.setPlacement(r.getPlacement());
        dto.setCategory(r.getCategory());
        dto.setBeltAtCompetition(r.getBeltAtCompetition());
        dto.setStripesAtCompetition(r.getStripesAtCompetition() != null ? r.getStripesAtCompetition() : 0);
        dto.setNotes(r.getNotes());
        return dto;
    }
}
