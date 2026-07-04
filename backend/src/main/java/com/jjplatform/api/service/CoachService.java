package com.jjplatform.api.service;

import com.jjplatform.api.dto.CoachInsightDto;
import com.jjplatform.api.dto.ConditioningSessionDto;
import com.jjplatform.api.dto.ProInsightsDto;
import com.jjplatform.api.dto.TrainingSessionDto;
import com.jjplatform.api.dto.TrainingSubmissionDto;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Pro "Coach IA": turns the student's own training data into a short, personalized coaching analysis
 * (strengths / weaknesses / what to drill) via the shared Claude integration. Cached per day so each
 * student costs at most one AI call per day. Premium gating is enforced by the caller (PortalService).
 */
@Service
@RequiredArgsConstructor
public class CoachService {

    private final StudentRepository studentRepository;
    private final TrainingService trainingService;
    private final ConditioningService conditioningService;
    private final AcademyChatService academyChatService;

    private static final String SYSTEM_PROMPT = """
        Eres un coach de jiu-jitsu y artes marciales que analiza el progreso de un alumno a partir de sus \
        datos de entrenamiento. Escribe en español, en segunda persona (tú), con tono cercano y motivador \
        pero honesto y directo. Devuelve SOLO texto plano: sin markdown, sin asteriscos, sin emojis, sin \
        títulos. Organiza la respuesta en 3 párrafos cortos separados por una línea en blanco:
        1) Lo que estás haciendo bien (1-2 frases concretas, usando sus números).
        2) Tu punto débil o riesgo (1-2 frases; si recibe muchas sumisiones de un mismo tipo, menciónalo).
        3) Qué hacer ahora: 2-3 acciones concretas y accionables para las próximas semanas.
        Máximo 160 palabras. Usa solo los datos que te entrego, no inventes nada. Si hay pocos datos, dilo \
        con amabilidad y anímalo a registrar más entrenos.""";

    /** Returns the stored coach insight without calling the AI (cheap; shown when the Pro tab opens). */
    public CoachInsightDto current(Student s) {
        return new CoachInsightDto(s.getCoachInsight(),
                s.getCoachInsightDate() != null ? s.getCoachInsightDate().toString() : null);
    }

    /**
     * Daily-cached AI coach analysis. If one was already generated on {@code clientToday}, returns it
     * without calling the AI again (so a student can't run up cost by spamming the button). Otherwise
     * builds a compact stats summary, asks Claude, caches it on the student, and returns it.
     */
    @Transactional
    public CoachInsightDto generate(Student s, LocalDate clientToday) {
        LocalDate today = clientToday != null ? clientToday : LocalDate.now();
        if (s.getCoachInsight() != null && today.equals(s.getCoachInsightDate())) {
            return new CoachInsightDto(s.getCoachInsight(), today.toString());
        }
        String text = academyChatService.complete(SYSTEM_PROMPT, buildContext(s, today));
        if (academyChatService.isFallback(text)) {
            throw new IllegalStateException("No se pudo generar el análisis ahora. Intenta de nuevo en un momento.");
        }
        s.setCoachInsight(text.trim());
        s.setCoachInsightDate(today);
        studentRepository.save(s);
        return new CoachInsightDto(s.getCoachInsight(), today.toString());
    }

    /** Compact, plain-language summary of the student's training data for the model to analyze. */
    private String buildContext(Student s, LocalDate today) {
        List<TrainingSessionDto> sessions = trainingService.listByStudent(s.getId());
        List<ConditioningSessionDto> cond = conditioningService.listByStudent(s.getId());

        LocalDate d30 = today.minusDays(30), d60 = today.minusDays(60), d90 = today.minusDays(90);
        int bjjTotal = 0, last30 = 0, prev30 = 0, gi = 0, nogi = 0, kick90 = 0;
        int totalLanded = 0, totalReceived = 0;
        long energySum = 0, energyN = 0, perfSum = 0, perfN = 0;
        Map<String, Integer> landed = new HashMap<>(), received = new HashMap<>();

        for (TrainingSessionDto t : sessions) {
            LocalDate dt = t.getDate();
            boolean recent30 = dt != null && !dt.isBefore(d30);
            boolean recent90 = dt != null && !dt.isBefore(d90);
            if ("Kickboxing".equalsIgnoreCase(t.getDisciplineName())) {
                if (recent90) kick90++;
            } else {
                bjjTotal++;
                if (recent30) last30++;
                else if (dt != null && !dt.isBefore(d60)) prev30++;
                if ("GI".equalsIgnoreCase(t.getModality())) gi++;
                else if ("NOGI".equalsIgnoreCase(t.getModality())) nogi++;
            }
            if (recent30) {
                if (t.getEnergy() != null) { energySum += t.getEnergy(); energyN++; }
                if (t.getPerformance() != null) { perfSum += t.getPerformance(); perfN++; }
            }
            for (TrainingSubmissionDto sub : t.getSubmissions()) {
                if ("RECIBIDA".equalsIgnoreCase(sub.getDirection())) { received.merge(sub.getName(), 1, Integer::sum); totalReceived++; }
                else { landed.merge(sub.getName(), 1, Integer::sum); totalLanded++; }
            }
        }
        int cond90 = 0;
        for (ConditioningSessionDto c : cond) if (c.getDate() != null && !c.getDate().isBefore(d90)) cond90++;

        ProInsightsDto pro = trainingService.proInsights(s.getAcademy().getId(), s.getId(), today);

        StringBuilder sb = new StringBuilder();
        sb.append("Datos del alumno para tu análisis (hoy ").append(today).append("):\n");
        if (s.getBelt() != null && !s.getBelt().isBlank()) {
            sb.append("- Cinturón: ").append(s.getBelt());
            if (s.getStripes() != null && s.getStripes() > 0)
                sb.append(" con ").append(s.getStripes()).append(" grado").append(s.getStripes() > 1 ? "s" : "");
            sb.append("\n");
        }
        sb.append("- Entrenos de BJJ totales registrados: ").append(bjjTotal)
          .append(". Últimos 30 días: ").append(last30).append(" (30 días previos: ").append(prev30)
          .append(last30 > prev30 ? " — subiendo" : last30 < prev30 ? " — bajando" : "").append(").\n");
        sb.append("- Modalidad BJJ: ").append(gi).append(" Gi / ").append(nogi).append(" No-Gi.\n");
        sb.append("- Kickboxing (últimos 90 días): ").append(kick90)
          .append(". Acondicionamiento/físico (90 días): ").append(cond90).append(".\n");
        sb.append("- Racha actual: ").append(pro.getYourStreak()).append(" días. Entrenos esta semana: ")
          .append(pro.getYourThisWeek()).append(".\n");
        if (pro.getTotalStudents() > 1) {
            sb.append("- En tu academia: puesto #").append(pro.getRank()).append(" de ").append(pro.getTotalStudents())
              .append(", sobre el ").append(pro.getPercentile()).append("% de tus compañeros.\n");
        }
        sb.append("- Sumisiones logradas (top): ").append(topN(landed)).append(". Total logradas: ").append(totalLanded).append(".\n");
        sb.append("- Sumisiones recibidas (top): ").append(topN(received)).append(". Total recibidas: ").append(totalReceived).append(".\n");
        if (energyN > 0) sb.append("- Energía media (30 días): ").append(round1((double) energySum / energyN)).append("/5.\n");
        if (perfN > 0) sb.append("- Desempeño medio (30 días): ").append(round1((double) perfSum / perfN)).append("/5.\n");
        return sb.toString();
    }

    private String topN(Map<String, Integer> m) {
        if (m.isEmpty()) return "ninguna registrada";
        return m.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(4)
                .map(e -> e.getKey() + " " + e.getValue())
                .collect(Collectors.joining(", "));
    }

    private String round1(double v) {
        return String.valueOf(Math.round(v * 10) / 10.0);
    }
}
