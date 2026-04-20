package com.jjplatform.api.controller;

import com.jjplatform.api.dto.AcademyPublicDto;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.exception.ResourceNotFoundException;
import com.jjplatform.api.repository.AcademyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final AcademyRepository academyRepository;

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
            return sd;
        }).toList());

        dto.setPhotos(a.getPhotos().stream().map(p -> {
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
                    return pd;
                }).toList());

        return dto;
    }
}
