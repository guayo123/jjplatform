package com.jjplatform.api.service;

import com.jjplatform.api.dto.ProfessorDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfessorService {

    private final ProfessorRepository professorRepository;
    private final AcademyRepository academyRepository;
    private final StudentRepository studentRepository;
    private final DisciplineRepository disciplineRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;

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

        return toDto(professorRepository.save(p));
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
