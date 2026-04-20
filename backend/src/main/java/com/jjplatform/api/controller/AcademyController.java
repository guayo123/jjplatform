package com.jjplatform.api.controller;

import com.jjplatform.api.dto.UpdateAcademyRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.service.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/academy")
@RequiredArgsConstructor
public class AcademyController {

    private final AcademyRepository academyRepository;
    private final PlanRepository planRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final SecurityHelper securityHelper;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyAcademy() {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalStateException("Academia no encontrada"));
        return ResponseEntity.ok(toMap(academy));
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> updateMyAcademy(@RequestBody UpdateAcademyRequest request) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalStateException("Academia no encontrada"));

        if (request.getName() != null && !request.getName().isBlank()) {
            academy.setName(request.getName());
        }
        if (request.getDescription() != null) academy.setDescription(request.getDescription());
        if (request.getAddress() != null) academy.setAddress(request.getAddress());
        if (request.getPhone() != null) academy.setPhone(request.getPhone());
        if (request.getWhatsapp() != null) {
            academy.setWhatsapp(request.getWhatsapp());
            // keep phone in sync with whatsapp
            academy.setPhone(request.getWhatsapp());
        }
        if (request.getInstagram() != null) academy.setInstagram(request.getInstagram());

        academy = academyRepository.save(academy);
        return ResponseEntity.ok(toMap(academy));
    }

    // ─── Schedules ────────────────────────────────────────────────────

    @GetMapping("/schedules")
    public ResponseEntity<List<Map<String, Object>>> getSchedules() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(
                classScheduleRepository.findByAcademyIdOrderByDayOfWeekAscStartTimeAsc(academyId)
                        .stream().map(this::scheduleToMap).toList()
        );
    }

    @PostMapping("/schedules")
    public ResponseEntity<Map<String, Object>> createSchedule(@RequestBody ScheduleRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalStateException("Academia no encontrada"));

        ClassSchedule s = ClassSchedule.builder()
                .academy(academy)
                .dayOfWeek(req.dayOfWeek())
                .startTime(LocalTime.parse(req.startTime()))
                .endTime(LocalTime.parse(req.endTime()))
                .className(req.className())
                .build();
        s = classScheduleRepository.save(s);
        return ResponseEntity.ok(scheduleToMap(s));
    }

    @PutMapping("/schedules/{sid}")
    public ResponseEntity<Map<String, Object>> updateSchedule(@PathVariable Long sid,
                                                               @RequestBody ScheduleRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        ClassSchedule s = classScheduleRepository.findById(sid)
                .orElseThrow(() -> new IllegalStateException("Horario no encontrado"));
        if (!s.getAcademy().getId().equals(academyId)) return ResponseEntity.status(403).build();

        if (req.dayOfWeek() != null) s.setDayOfWeek(req.dayOfWeek());
        if (req.startTime() != null) s.setStartTime(LocalTime.parse(req.startTime()));
        if (req.endTime() != null) s.setEndTime(LocalTime.parse(req.endTime()));
        if (req.className() != null && !req.className().isBlank()) s.setClassName(req.className());
        s = classScheduleRepository.save(s);
        return ResponseEntity.ok(scheduleToMap(s));
    }

    @DeleteMapping("/schedules/{sid}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long sid) {
        Long academyId = securityHelper.getCurrentAcademyId();
        ClassSchedule s = classScheduleRepository.findById(sid).orElse(null);
        if (s == null || !s.getAcademy().getId().equals(academyId))
            return ResponseEntity.notFound().build();
        classScheduleRepository.delete(s);
        return ResponseEntity.noContent().build();
    }

    // ─── Plans ───────────────────────────────────────────────────────────────

    @GetMapping("/plans")
    public ResponseEntity<List<Map<String, Object>>> getPlans() {
        Long academyId = securityHelper.getCurrentAcademyId();
        List<Map<String, Object>> plans = planRepository
                .findByAcademyIdOrderByDisplayOrderAscIdAsc(academyId)
                .stream().map(this::planToMap).toList();
        return ResponseEntity.ok(plans);
    }

    @PostMapping("/plans")
    public ResponseEntity<Map<String, Object>> createPlan(@RequestBody PlanRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalStateException("Academia no encontrada"));

        Plan plan = Plan.builder()
                .academy(academy)
                .name(req.name())
                .description(req.description())
                .price(req.price())
                .features(req.features())
                .displayOrder(req.displayOrder())
                .build();

        plan = planRepository.save(plan);
        return ResponseEntity.ok(planToMap(plan));
    }

    @PutMapping("/plans/{planId}")
    public ResponseEntity<Map<String, Object>> updatePlan(@PathVariable Long planId,
                                                          @RequestBody PlanRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new IllegalStateException("Plan no encontrado"));

        if (!plan.getAcademy().getId().equals(academyId)) {
            return ResponseEntity.status(403).build();
        }

        if (req.name() != null && !req.name().isBlank()) plan.setName(req.name());
        if (req.description() != null) plan.setDescription(req.description());
        if (req.price() != null) plan.setPrice(req.price());
        if (req.features() != null) plan.setFeatures(req.features());
        if (req.displayOrder() != null) plan.setDisplayOrder(req.displayOrder());

        plan = planRepository.save(plan);
        return ResponseEntity.ok(planToMap(plan));
    }

    @PutMapping("/plans/{planId}/toggle-active")
    public ResponseEntity<Map<String, Object>> togglePlan(@PathVariable Long planId) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new IllegalStateException("Plan no encontrado"));

        if (!plan.getAcademy().getId().equals(academyId)) {
            return ResponseEntity.status(403).build();
        }

        plan.setActive(!plan.getActive());
        plan = planRepository.save(plan);
        return ResponseEntity.ok(planToMap(plan));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Map<String, Object> scheduleToMap(ClassSchedule s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("dayOfWeek", s.getDayOfWeek());
        m.put("startTime", s.getStartTime().toString());
        m.put("endTime", s.getEndTime().toString());
        m.put("className", s.getClassName());
        return m;
    }

    private Map<String, Object> toMap(Academy a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("name", a.getName());
        map.put("description", a.getDescription() != null ? a.getDescription() : "");
        map.put("address", a.getAddress() != null ? a.getAddress() : "");
        map.put("whatsapp", a.getWhatsapp() != null ? a.getWhatsapp() : "");
        map.put("instagram", a.getInstagram() != null ? a.getInstagram() : "");
        map.put("logoUrl", a.getLogoUrl());
        return map;
    }

    private Map<String, Object> planToMap(Plan p) {
        return Map.of(
                "id", p.getId(),
                "name", p.getName(),
                "description", p.getDescription() != null ? p.getDescription() : "",
                "price", p.getPrice() != null ? p.getPrice() : 0,
                "features", p.getFeatures() != null ? p.getFeatures() : "",
                "active", p.getActive(),
                "displayOrder", p.getDisplayOrder() != null ? p.getDisplayOrder() : 0
        );
    }

    record PlanRequest(String name, String description, Integer price, String features, Integer displayOrder) {}

    record ScheduleRequest(String dayOfWeek, String startTime, String endTime, String className) {}
}

