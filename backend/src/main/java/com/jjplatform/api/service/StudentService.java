package com.jjplatform.api.service;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;

    public List<StudentDto> getStudentsByAcademy(Long academyId) {
        return studentRepository.findByAcademyIdOrderByNameAsc(academyId).stream()
                .map(this::toDto)
                .toList();
    }

    public StudentDto getStudent(Long id, Long academyId) {
        Student student = findStudentByIdAndAcademy(id, academyId);
        return toDto(student);
    }

    @Transactional
    public StudentDto createStudent(StudentDto dto, Long academyId) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));

        Student student = Student.builder()
                .academy(academy)
                .name(dto.getName())
                .rut(dto.getRut())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .joinDate(dto.getJoinDate() != null ? LocalDate.parse(dto.getJoinDate()) : null)
                .age(dto.getAge())
                .weight(dto.getWeight())
                .belt(dto.getBelt())
                .photoUrl(dto.getPhotoUrl())
                .address(dto.getAddress())
                .medicalNotes(dto.getMedicalNotes())
                .active(true)
                .build();

        student = studentRepository.save(student);
        return toDto(student);
    }

    @Transactional
    public StudentDto updateStudent(Long id, StudentDto dto, Long academyId) {
        Student student = findStudentByIdAndAcademy(id, academyId);

        student.setName(dto.getName());
        student.setRut(dto.getRut());
        student.setEmail(dto.getEmail());
        student.setPhone(dto.getPhone());
        student.setJoinDate(dto.getJoinDate() != null ? LocalDate.parse(dto.getJoinDate()) : null);
        student.setAge(dto.getAge());
        student.setWeight(dto.getWeight());
        // belt and stripes are managed exclusively via BeltPromotionService
        student.setPhotoUrl(dto.getPhotoUrl());
        student.setAddress(dto.getAddress());
        student.setMedicalNotes(dto.getMedicalNotes());
        if (dto.getActive() != null) {
            student.setActive(dto.getActive());
        }

        student = studentRepository.save(student);
        return toDto(student);
    }

    @Transactional
    public void deleteStudent(Long id, Long academyId) {
        Student student = findStudentByIdAndAcademy(id, academyId);
        student.setActive(false);
        studentRepository.save(student);
    }

    private Student findStudentByIdAndAcademy(Long id, Long academyId) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (!student.getAcademy().getId().equals(academyId)) {
            throw new ResourceNotFoundException("Student not found in this academy");
        }
        return student;
    }

    private StudentDto toDto(Student student) {
        StudentDto dto = new StudentDto();
        dto.setId(student.getId());
        dto.setName(student.getName());
        dto.setRut(student.getRut());
        dto.setEmail(student.getEmail());
        dto.setPhone(student.getPhone());
        dto.setJoinDate(student.getJoinDate() != null ? student.getJoinDate().toString() : null);
        dto.setAge(student.getAge());
        dto.setWeight(student.getWeight());
        dto.setBelt(student.getBelt());
        dto.setStripes(student.getStripes());
        dto.setPhotoUrl(student.getPhotoUrl());
        dto.setAddress(student.getAddress());
        dto.setMedicalNotes(student.getMedicalNotes());
        dto.setActive(student.getActive());
        return dto;
    }
}
