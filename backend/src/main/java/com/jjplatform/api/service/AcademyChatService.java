package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademyChatService {

    private final AcademyRepository academyRepository;
    private final PlanRepository planRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final ProfessorRepository professorRepository;
    private final ConversationStore conversationStore;
    private final RestTemplate restTemplate;

    @Value("${app.anthropic.api-key:}")
    private String anthropicApiKey;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.groq.api-key:}")
    private String groqApiKey;

    private static final String ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=";
    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    /** Llamado desde el webhook — mantiene historial por número de teléfono. */
    public String chat(Long academyId, String phone, String userMessage) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalArgumentException("Academy not found"));

        List<Map<String, String>> history = conversationStore.getHistory(phone);
        conversationStore.append(phone, "user", userMessage);

        String reply = callAI(buildSystemPrompt(academy), buildMessages(history, userMessage));
        conversationStore.append(phone, "assistant", reply);
        return reply;
    }

    /** Llamado desde el panel de prueba — sin historial. */
    public String chatTest(Long academyId, String userMessage) {
        Academy academy = academyRepository.findById(academyId)
                .orElseThrow(() -> new IllegalArgumentException("Academy not found"));
        return callAI(buildSystemPrompt(academy), buildMessages(List.of(), userMessage));
    }

    // ── Routing ───────────────────────────────────────────────────────────────

    private String callAI(String systemPrompt, List<Map<String, Object>> messages) {
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) return callClaude(systemPrompt, messages);
        if (groqApiKey      != null && !groqApiKey.isBlank())      return callGroq(systemPrompt, messages);
        if (geminiApiKey    != null && !geminiApiKey.isBlank())    return callGemini(systemPrompt, messages);
        return "El asistente no está configurado. Agrega GROQ_API_KEY al servidor.";
    }

    // ── Anthropic (Claude) ────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callClaude(String systemPrompt, List<Map<String, Object>> messages) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", anthropicApiKey);
        headers.set("anthropic-version", "2023-06-01");
        headers.set("anthropic-beta", "prompt-caching-2024-07-31");

        Map<String, Object> body = new HashMap<>();
        body.put("model", ANTHROPIC_MODEL);
        body.put("max_tokens", 512);
        body.put("system", List.of(Map.of(
                "type", "text",
                "text", systemPrompt,
                "cache_control", Map.of("type", "ephemeral")
        )));
        body.put("messages", messages);

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    ANTHROPIC_URL, new HttpEntity<>(body, headers), Map.class);
            if (response == null) return fallbackMessage();
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            if (content == null || content.isEmpty()) return fallbackMessage();
            return (String) content.get(0).get("text");
        } catch (Exception e) {
            log.error("Claude API error: {}", e.getMessage());
            return fallbackMessage();
        }
    }

    // ── Groq (Llama) ─────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGroq(String systemPrompt, List<Map<String, Object>> messages) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        // Groq usa formato OpenAI: system message + historial
        List<Map<String, Object>> allMessages = new ArrayList<>();
        Map<String, Object> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        allMessages.add(systemMsg);
        allMessages.addAll(messages);

        Map<String, Object> body = new HashMap<>();
        body.put("model", GROQ_MODEL);
        body.put("messages", allMessages);
        body.put("max_tokens", 512);
        body.put("temperature", 0.7);

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    GROQ_URL, new HttpEntity<>(body, headers), Map.class);
            if (response == null) return fallbackMessage();
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return fallbackMessage();
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            log.error("Groq API error: {}", e.getMessage());
            return fallbackMessage();
        }
    }

    // ── Google Gemini ─────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGemini(String systemPrompt, List<Map<String, Object>> messages) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Gemini usa "model" en vez de "assistant"
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Map<String, Object> m : messages) {
            String role = "assistant".equals(m.get("role")) ? "model" : "user";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", m.get("content")))
            ));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of("maxOutputTokens", 512, "temperature", 0.7));

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_URL + geminiApiKey, new HttpEntity<>(body, headers), Map.class);
            if (response == null) return fallbackMessage();
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return fallbackMessage();
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage());
            return fallbackMessage();
        }
    }

    private String fallbackMessage() {
        return "Lo siento, tuve un problema al procesar tu mensaje. Intenta de nuevo en un momento.";
    }

    // ── Construcción de mensajes ──────────────────────────────────────────────

    private List<Map<String, Object>> buildMessages(List<Map<String, String>> history, String userMessage) {
        List<Map<String, Object>> messages = new ArrayList<>();
        for (Map<String, String> m : history) {
            Map<String, Object> msg = new HashMap<>();
            msg.put("role", m.get("role"));
            msg.put("content", m.get("content"));
            messages.add(msg);
        }
        Map<String, Object> last = new HashMap<>();
        last.put("role", "user");
        last.put("content", userMessage);
        messages.add(last);
        return messages;
    }

    // ── System prompt ─────────────────────────────────────────────────────────

    private String buildSystemPrompt(Academy academy) {
        Long academyId = academy.getId();
        StringBuilder sb = new StringBuilder();
        sb.append("Eres el asistente virtual de ").append(academy.getName()).append(", una academia de artes marciales. ");
        sb.append("Tu rol es responder preguntas de personas interesadas en inscribirse o saber más sobre la academia.\n\n");

        sb.append("REGLAS IMPORTANTES:\n");
        sb.append("- Responde SIEMPRE en español, de forma amable y directa.\n");
        sb.append("- Sé breve: los mensajes de WhatsApp deben ser cortos (máximo 3-4 líneas).\n");
        sb.append("- NO uses markdown, asteriscos ni formato especial — solo texto plano.\n");
        sb.append("- Si alguien pregunta algo que no está en tu información, diles que contacten directamente a la academia");
        if (academy.getWhatsapp() != null && !academy.getWhatsapp().isBlank())
            sb.append(" al ").append(academy.getWhatsapp());
        sb.append(".\n");
        sb.append("- No inventes información que no esté aquí.\n");
        sb.append("- Si saludan, saluda de vuelta presentándote como el asistente de ").append(academy.getName()).append(".\n");
        sb.append("- Recuerda el contexto de la conversación para responder de forma coherente.\n\n");

        sb.append("INFORMACIÓN DE LA ACADEMIA:\n");
        if (academy.getDescription() != null && !academy.getDescription().isBlank())
            sb.append("Descripción: ").append(academy.getDescription()).append("\n");
        if (academy.getAddress() != null && !academy.getAddress().isBlank())
            sb.append("Dirección: ").append(academy.getAddress()).append("\n");
        if (academy.getWhatsapp() != null && !academy.getWhatsapp().isBlank())
            sb.append("Contacto: ").append(academy.getWhatsapp()).append("\n");
        sb.append("\n");

        List<Plan> activePlans = planRepository.findByAcademyIdOrderByDisplayOrderAscIdAsc(academyId)
                .stream().filter(p -> Boolean.TRUE.equals(p.getActive())).toList();
        if (!activePlans.isEmpty()) {
            sb.append("PLANES Y PRECIOS:\n");
            for (Plan p : activePlans) {
                sb.append("- ").append(p.getName());
                if (p.getDiscipline() != null) sb.append(" (").append(p.getDiscipline().getName()).append(")");
                if (p.getPrice() != null) sb.append(": $").append(String.format("%,d", p.getPrice())).append(" CLP/mes");
                if (p.getDescription() != null && !p.getDescription().isBlank())
                    sb.append(". ").append(p.getDescription());
                if (p.getFeatures() != null && !p.getFeatures().isBlank())
                    sb.append(". Incluye: ").append(p.getFeatures());
                sb.append("\n");
            }
            sb.append("\n");
        }

        List<ClassSchedule> schedules = classScheduleRepository
                .findByAcademyIdOrderByDayOfWeekAscStartTimeAsc(academyId);
        if (!schedules.isEmpty()) {
            sb.append("HORARIOS:\n");
            String[] dayOrder = {"LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"};
            String[] dayNames = {"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"};
            for (int i = 0; i < dayOrder.length; i++) {
                final String day = dayOrder[i];
                final String dayName = dayNames[i];
                schedules.stream()
                        .filter(s -> day.equals(s.getDayOfWeek()))
                        .forEach(s -> sb.append("- ").append(dayName)
                                .append(" ").append(s.getStartTime())
                                .append(" a ").append(s.getEndTime())
                                .append(": ").append(s.getClassName()).append("\n"));
            }
            sb.append("\n");
        }

        List<Professor> professors = professorRepository
                .findByAcademyIdOrderByDisplayOrderAscNameAsc(academyId)
                .stream().filter(p -> Boolean.TRUE.equals(p.getActive())).toList();
        if (!professors.isEmpty()) {
            sb.append("PROFESORES:\n");
            for (Professor p : professors) {
                sb.append("- ").append(p.getName());
                if (p.getBelt() != null) sb.append(", cinturón ").append(p.getBelt());
                if (p.getBio() != null && !p.getBio().isBlank())
                    sb.append(". ").append(p.getBio());
                sb.append("\n");
            }
        }

        return sb.toString();
    }
}
