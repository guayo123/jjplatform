package com.jjplatform.api.service;

import com.jjplatform.api.dto.StudentDto;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.model.StudentDiscipline;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.StudentDisciplineRepository;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final AcademyRepository academyRepository;
    private final PlanRepository planRepository;
    private final StudentDisciplineRepository studentDisciplineRepository;
    private final SecurityHelper securityHelper;

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsByAcademy(Long academyId) {
        // Exclude "shell" students created solely to back a Professor's belt history
        // (heuristic: inactive AND no plans assigned).
        List<Student> students = studentRepository.findByAcademyIdOrderByNameAsc(academyId).stream()
                .filter(s -> Boolean.TRUE.equals(s.getActive()) || (s.getPlans() != null && !s.getPlans().isEmpty()))
                .toList();

        // Batch-load all active disciplines for every student (single query)
        List<Long> allIds = students.stream().map(Student::getId).toList();
        Map<Long, List<StudentDiscipline>> discsByStudent = allIds.isEmpty()
                ? Map.of()
                : studentDisciplineRepository.findByStudentIdInAndActiveTrue(allIds)
                        .stream()
                        .collect(Collectors.groupingBy(sd -> sd.getStudent().getId()));

        return students.stream().map(s -> {
            StudentDto dto = toDto(s);
            List<StudentDiscipline> discs = discsByStudent.getOrDefault(s.getId(), List.of());

            // disciplineBelts list — one entry per active discipline that has a belt
            List<StudentDto.DisciplineBeltInfo> beltInfos = discs.stream()
                    .filter(sd -> sd.getBelt() != null)
                    .map(sd -> {
                        StudentDto.DisciplineBeltInfo info = new StudentDto.DisciplineBeltInfo();
                        info.setDisciplineId(sd.getDiscipline().getId());
                        info.setDisciplineName(sd.getDiscipline().getName());
                        info.setBelt(sd.getBelt());
                        info.setStripes(sd.getStripes());
                        String hex = sd.getAgeCategory() == null ? null :
                                sd.getAgeCategory().getBelts().stream()
                                        .filter(b -> b.getName().equals(sd.getBelt()))
                                        .map(b -> b.getColorHex())
                                        .findFirst().orElse(null);
                        info.setBeltColorHex(hex);
                        return info;
                    }).toList();
            dto.setDisciplineBelts(beltInfos);

            // Keep student.belt in sync: prefer discipline data over legacy global field
            if (!beltInfos.isEmpty()) {
                dto.setBelt(beltInfos.get(0).getBelt());
                dto.setStripes(beltInfos.get(0).getStripes());
            }
            return dto;
        }).toList();
    }

    @Transactional(readOnly = true)
    public StudentDto getStudent(Long id, Long academyId) {
        Student student = findStudentByIdAndAcademy(id, academyId);
        return enrichWithDisciplineBelts(toDto(student), student.getId());
    }

    /**
     * Returns every student record linked to the given login user (portal "my info" view).
     * A person enrolled in several academies has one record per academy, all linked to the same
     * login user; the portal lets them switch between these. STUDENT can see exclusively its own data.
     */
    @Transactional(readOnly = true)
    public List<StudentDto> getMyStudents(Long userId) {
        List<Student> students = studentRepository.findByUser_Id(userId);
        if (students.isEmpty()) {
            throw new ResourceNotFoundException("No se encontró el alumno asociado a tu cuenta.");
        }
        return students.stream()
                .map(s -> enrichWithDisciplineBelts(toDto(s), s.getId()))
                .toList();
    }

    /** Adds the per-discipline belt list to a DTO and syncs the legacy belt/stripes fields from it. */
    private StudentDto enrichWithDisciplineBelts(StudentDto dto, Long studentId) {
        List<StudentDiscipline> discs = studentDisciplineRepository
                .findByStudentIdInAndActiveTrue(List.of(studentId));

        List<StudentDto.DisciplineBeltInfo> beltInfos = discs.stream()
                .filter(sd -> sd.getBelt() != null)
                .map(sd -> {
                    StudentDto.DisciplineBeltInfo info = new StudentDto.DisciplineBeltInfo();
                    info.setDisciplineId(sd.getDiscipline().getId());
                    info.setDisciplineName(sd.getDiscipline().getName());
                    info.setBelt(sd.getBelt());
                    info.setStripes(sd.getStripes());
                    String hex = sd.getAgeCategory() == null ? null :
                            sd.getAgeCategory().getBelts().stream()
                                    .filter(b -> b.getName().equals(sd.getBelt()))
                                    .map(b -> b.getColorHex())
                                    .findFirst().orElse(null);
                    info.setBeltColorHex(hex);
                    return info;
                }).toList();

        dto.setDisciplineBelts(beltInfos);
        if (!beltInfos.isEmpty()) {
            dto.setBelt(beltInfos.get(0).getBelt());
            dto.setStripes(beltInfos.get(0).getStripes());
        }
        return dto;
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
        if (student.getAcademy() != null) {
            dto.setAcademyId(student.getAcademy().getId());
            dto.setAcademyName(student.getAcademy().getName());
        }
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
                    if (p.getProfessor() != null) {
                        planInfo.setProfessorId(p.getProfessor().getId());
                        planInfo.setProfessorName(p.getProfessor().getName());
                    }
                    return planInfo;
                }).toList());

        return dto;
    }
}
