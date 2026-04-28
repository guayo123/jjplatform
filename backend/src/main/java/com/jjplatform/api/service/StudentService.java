package com.jjplatform.api.service;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PlanRepository;
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
    private final PlanRepository planRepository;

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsByAcademy(Long academyId) {
        return studentRepository.findByAcademyIdOrderByNameAsc(academyId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
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
                .nickname(dto.getNickname())
                .emergencyPhone(dto.getEmergencyPhone())
                .bloodType(dto.getBloodType())
                .healthInsuranceType(dto.getHealthInsuranceType())
                .healthInsuranceCompany(dto.getHealthInsuranceCompany())
                .active(true)
                .build();

        if (dto.getPlanIds() != null && !dto.getPlanIds().isEmpty()) {
            List<Plan> plans = planRepository.findAllById(dto.getPlanIds());
            student.setPlans(plans);
        }

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
        student.setNickname(dto.getNickname());
        student.setEmergencyPhone(dto.getEmergencyPhone());
        student.setBloodType(dto.getBloodType());
        student.setHealthInsuranceType(dto.getHealthInsuranceType());
        student.setHealthInsuranceCompany(dto.getHealthInsuranceCompany());
        if (dto.getActive() != null) {
            student.setActive(dto.getActive());
        }

        if (dto.getPlanIds() != null) {
            List<Plan> plans = dto.getPlanIds().isEmpty() ? List.of() : planRepository.findAllById(dto.getPlanIds());
            student.setPlans(plans);
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
        dto.setNickname(student.getNickname());
        dto.setEmergencyPhone(student.getEmergencyPhone());
        dto.setBloodType(student.getBloodType());
        dto.setHealthInsuranceType(student.getHealthInsuranceType());
        dto.setHealthInsuranceCompany(student.getHealthInsuranceCompany());
        dto.setActive(student.getActive());

        dto.setEnrolledPlans(student.getPlans().stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .map(p -> {
                    StudentDto.PlanInfo planInfo = new StudentDto.PlanInfo();
                    planInfo.setId(p.getId());
                    planInfo.setName(p.getName());
                    planInfo.setDisciplineName(p.getDiscipline() != null ? p.getDiscipline().getName() : null);
                    planInfo.setPrice(p.getPrice());
                    return planInfo;
                }).toList());

        return dto;
    }
}
