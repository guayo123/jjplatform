package com.jjplatform.api.controller;

import com.jjplatform.api.dto.AcademyPublicDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.BeltPromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final AcademyRepository academyRepository;
    private final BeltPromotionRepository beltPromotionRepository;

    @GetMapping("/academies")
    public ResponseEntity<List<AcademyPublicDto>> listAcademies() {
        List<AcademyPublicDto> academies = academyRepository.findAll().stream()
                .map(this::toPublicDto)
                .toList();
        return ResponseEntity.ok(academies);
    }

    @GetMapping("/academies/{id}")
    public ResponseEntity<AcademyPublicDto> getAcademy(@PathVariable Long id) {
        Academy academy = academyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Academy not found"));
        return ResponseEntity.ok(toPublicDto(academy));
    }

    private AcademyPublicDto toPublicDto(Academy a) {
        AcademyPublicDto dto = new AcademyPublicDto();
        dto.setId(a.getId());
        dto.setName(a.getName());
        dto.setDescription(a.getDescription());
        dto.setAddress(a.getAddress());
        dto.setPhone(a.getPhone());
        dto.setLogoUrl(a.getLogoUrl());
        dto.setWhatsapp(a.getWhatsapp());
        dto.setInstagram(a.getInstagram());

        dto.setSchedules(a.getSchedules().stream().map(s -> {
            AcademyPublicDto.ScheduleDto sd = new AcademyPublicDto.ScheduleDto();
            sd.setId(s.getId());
            sd.setDayOfWeek(s.getDayOfWeek());
            sd.setStartTime(s.getStartTime());
            sd.setEndTime(s.getEndTime());
            sd.setClassName(s.getClassName());
            com.jjplatform.api.model.Professor prof = s.getProfessor() != null
                    ? s.getProfessor()
                    : (s.getPlan() != null ? s.getPlan().getProfessor() : null);
            sd.setProfessorName(prof != null ? prof.getName() : null);
            sd.setProfessorPhotoUrl(prof != null ? prof.getPhotoUrl() : null);
            return sd;
        }).toList());

        // Exclude photos that are being used as professor or student profile pictures
        java.util.Set<String> profileUrls = new java.util.HashSet<>();
        a.getProfessors().forEach(p -> { if (p.getPhotoUrl() != null) profileUrls.add(p.getPhotoUrl()); });
        a.getStudents().forEach(s -> { if (s.getPhotoUrl() != null) profileUrls.add(s.getPhotoUrl()); });

        dto.setPhotos(a.getPhotos().stream()
                .filter(p -> !profileUrls.contains(p.getUrl()))
                .map(p -> {
                    AcademyPublicDto.PhotoDto pd = new AcademyPublicDto.PhotoDto();
                    pd.setId(p.getId());
                    pd.setUrl(p.getUrl());
                    pd.setCaption(p.getCaption());
                    return pd;
                }).toList());

        dto.setTournaments(a.getTournaments().stream().map(t -> {
            AcademyPublicDto.TournamentSummaryDto td = new AcademyPublicDto.TournamentSummaryDto();
            td.setId(t.getId());
            td.setName(t.getName());
            td.setDate(t.getDate().toString());
            td.setStatus(t.getStatus().name());
            td.setParticipantCount(t.getParticipants().size());
            return td;
        }).toList());

        dto.setPlans(a.getPlans().stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .sorted(java.util.Comparator.comparingInt(p -> p.getDisplayOrder() != null ? p.getDisplayOrder() : 0))
                .map(p -> {
                    AcademyPublicDto.PlanDto pd = new AcademyPublicDto.PlanDto();
                    pd.setId(p.getId());
                    pd.setName(p.getName());
                    pd.setDescription(p.getDescription());
                    pd.setPrice(p.getPrice());
                    pd.setFeatures(p.getFeatures());
                    pd.setDisplayOrder(p.getDisplayOrder());
                    if (p.getDiscipline() != null) {
                        pd.setDisciplineId(p.getDiscipline().getId());
                        pd.setDisciplineName(p.getDiscipline().getName());
                    }
                    return pd;
                }).toList());

        dto.setRecentPromotions(beltPromotionRepository
                .findTop5ByAcademyIdOrderByPromotionDateDesc(a.getId())
                .stream().map(p -> {
                    AcademyPublicDto.RecentPromotionDto rd = new AcademyPublicDto.RecentPromotionDto();
                    rd.setStudentName(p.getStudent().getName());
                    rd.setStudentPhotoUrl(p.getStudent().getPhotoUrl());
                    rd.setFromBelt(p.getFromBelt());
                    rd.setToBelt(p.getToBelt());
                    rd.setPromotionDate(p.getPromotionDate().toString());
                    return rd;
                }).toList());

        dto.setProfessors(a.getProfessors().stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .sorted(Comparator.comparingInt(p -> p.getDisplayOrder() != null ? p.getDisplayOrder() : 0))
                .map(p -> {
                    AcademyPublicDto.ProfessorDto pd = new AcademyPublicDto.ProfessorDto();
                    pd.setId(p.getId());
                    pd.setName(p.getName());
                    pd.setPhotoUrl(p.getPhotoUrl());
                    pd.setBio(p.getBio());
                    pd.setAchievements(p.getAchievements());
                    pd.setBelt(p.getBelt());
                    pd.setDisplayOrder(p.getDisplayOrder());
                    List<com.jjplatform.api.model.Plan> profPlans = a.getPlans().stream()
                            .filter(plan -> plan.getProfessor() != null
                                    && plan.getProfessor().getId().equals(p.getId()))
                            .collect(Collectors.toList());
                    pd.setPlanNames(profPlans.stream()
                            .map(com.jjplatform.api.model.Plan::getName)
                            .collect(Collectors.toList()));
                    pd.setDisciplineNames(profPlans.stream()
                            .filter(plan -> plan.getDiscipline() != null)
                            .map(plan -> plan.getDiscipline().getName())
                            .distinct()
                            .collect(Collectors.toList()));
                    return pd;
                }).toList());

        return dto;
    }
}
