package com.jjplatform.api.controller;

import com.jjplatform.api.dto.UpdateAcademyRequest;
import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.DisciplineRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.ProfessorRepository;
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
    private final DisciplineRepository disciplineRepository;
    private final ProfessorRepository professorRepository;
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
            academy.setPhone(request.getWhatsapp());
        }
        if (request.getInstagram() != null) academy.setInstagram(request.getInstagram());

        academy = academyRepository.save(academy);
        return ResponseEntity.ok(toMap(academy));
    }

    // ─── Disciplines ──────────────────────────────────────────────────────────

    @GetMapping("/disciplines")
    public ResponseEntity<List<Map<String, Object>>> getDisciplines() {
        Long academyId = securityHelper.getCurrentAcademyId();
        return ResponseEntity.ok(
                disciplineRepository.findByAcademyIdOrderByNameAsc(academyId)
                        .stream().map(this::disciplineToMap).toList()
        );
    }

    @PostMapping("/disciplines")
    public ResponseEntity<Map<String, Object>> createDiscipline(@RequestBody DisciplineRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalStateException("Academia no encontrada"));

        Discipline d = Discipline.builder()
                .academy(academy)
                .name(req.name())
                .build();
        d = disciplineRepository.save(d);
        return ResponseEntity.ok(disciplineToMap(d));
    }

    @PutMapping("/disciplines/{did}")
    public ResponseEntity<Map<String, Object>> updateDiscipline(@PathVariable Long did,
                                                                 @RequestBody DisciplineRequest req) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Discipline d = disciplineRepository.findById(did)
                .orElseThrow(() -> new IllegalStateException("Disciplina no encontrada"));
        if (!d.getAcademy().getId().equals(academyId)) return ResponseEntity.status(403).build();

        if (req.name() != null && !req.name().isBlank()) d.setName(req.name());
        d = disciplineRepository.save(d);
        return ResponseEntity.ok(disciplineToMap(d));
    }

    @PutMapping("/disciplines/{did}/toggle-active")
    public ResponseEntity<Map<String, Object>> toggleDiscipline(@PathVariable Long did) {
        Long academyId = securityHelper.getCurrentAcademyId();
        Discipline d = disciplineRepository.findById(did)
                .orElseThrow(() -> new IllegalStateException("Disciplina no encontrada"));
        if (!d.getAcademy().getId().equals(academyId)) return ResponseEntity.status(403).build();

        d.setActive(!d.getActive());
        d = disciplineRepository.save(d);
        return ResponseEntity.ok(disciplineToMap(d));
    }

    // ─── Schedules ────────────────────────────────────────────────────────────

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

        Plan plan = null;
        if (req.planId() != null) {
            plan = planRepository.findById(req.planId()).orElse(null);
        }
        Professor professor = null;
        if (req.professorId() != null) {
            professor = professorRepository.findById(req.professorId()).orElse(null);
        }
        String className = (req.className() != null && !req.className().isBlank())
                ? req.className()
                : (plan != null ? plan.getName() : "");

        ClassSchedule s = ClassSchedule.builder()
                .academy(academy)
                .dayOfWeek(req.dayOfWeek())
                .startTime(LocalTime.parse(req.startTime()))
                .endTime(LocalTime.parse(req.endTime()))
                .className(className)
                .plan(plan)
                .professor(professor)
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

        if (req.planId() != null) {
            Plan plan = planRepository.findById(req.planId()).orElse(null);
            s.setPlan(plan);
            if (plan != null && (req.className() == null || req.className().isBlank())) {
                s.setClassName(plan.getName());
            }
        } else if (req.className() != null && !req.className().isBlank()) {
            s.setPlan(null);
        }
        if (req.className() != null && !req.className().isBlank()) {
            s.setClassName(req.className());
        }
        if (req.professorId() != null) {
            s.setProfessor(professorRepository.findById(req.professorId()).orElse(null));
        } else {
            s.setProfessor(null);
        }

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

        Discipline discipline = null;
        if (req.disciplineId() != null) {
            discipline = disciplineRepository.findById(req.disciplineId()).orElse(null);
        }
        Professor professor = null;
        if (req.professorId() != null) {
            professor = professorRepository.findById(req.professorId()).orElse(null);
        }

        Plan plan = Plan.builder()
                .academy(academy)
                .name(req.name())
                .description(req.description())
                .price(req.price())
                .features(req.features())
                .displayOrder(req.displayOrder())
                .discipline(discipline)
                .professor(professor)
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

        if (req.disciplineId() != null) {
            Discipline discipline = disciplineRepository.findById(req.disciplineId()).orElse(null);
            plan.setDiscipline(discipline);
        } else {
            plan.setDiscipline(null);
        }
        if (req.professorId() != null) {
            Professor professor = professorRepository.findById(req.professorId()).orElse(null);
            plan.setProfessor(professor);
        } else {
            plan.setProfessor(null);
        }

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

    private Map<String, Object> disciplineToMap(Discipline d) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("name", d.getName());
        m.put("active", d.getActive());
        return m;
    }

    private Map<String, Object> scheduleToMap(ClassSchedule s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("dayOfWeek", s.getDayOfWeek());
        m.put("startTime", s.getStartTime().toString());
        m.put("endTime", s.getEndTime().toString());
        m.put("className", s.getClassName());
        m.put("planId", s.getPlan() != null ? s.getPlan().getId() : null);
        // Professor on the schedule overrides the plan's professor
        Professor prof = s.getProfessor() != null ? s.getProfessor()
                : (s.getPlan() != null ? s.getPlan().getProfessor() : null);
        m.put("professorId", s.getProfessor() != null ? s.getProfessor().getId() : null);
        m.put("professorName", prof != null ? prof.getName() : null);
        m.put("professorPhotoUrl", prof != null ? prof.getPhotoUrl() : null);
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
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("description", p.getDescription() != null ? p.getDescription() : "");
        m.put("price", p.getPrice() != null ? p.getPrice() : 0);
        m.put("features", p.getFeatures() != null ? p.getFeatures() : "");
        m.put("active", p.getActive());
        m.put("displayOrder", p.getDisplayOrder() != null ? p.getDisplayOrder() : 0);
        m.put("disciplineId", p.getDiscipline() != null ? p.getDiscipline().getId() : null);
        m.put("disciplineName", p.getDiscipline() != null ? p.getDiscipline().getName() : null);
        m.put("professorId", p.getProfessor() != null ? p.getProfessor().getId() : null);
        m.put("professorName", p.getProfessor() != null ? p.getProfessor().getName() : null);
        return m;
    }

    record DisciplineRequest(String name) {}

    record PlanRequest(String name, String description, Integer price, String features,
                       Integer displayOrder, Long disciplineId, Long professorId) {}

    record ScheduleRequest(String dayOfWeek, String startTime, String endTime,
                           String className, Long planId, Long professorId) {}
}
