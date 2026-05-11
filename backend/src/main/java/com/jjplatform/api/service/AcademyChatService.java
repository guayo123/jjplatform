package com.jjplatform.api.service;

import com.jjplatform.api.model.Academy;
import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Payment;
import com.jjplatform.api.model.Plan;
import com.jjplatform.api.model.Professor;
import com.jjplatform.api.model.Student;
import com.jjplatform.api.repository.AcademyRepository;
import com.jjplatform.api.repository.ClassScheduleRepository;
import com.jjplatform.api.repository.PaymentRepository;
import com.jjplatform.api.repository.PlanRepository;
import com.jjplatform.api.repository.ProfessorRepository;
import com.jjplatform.api.repository.StudentRepository;
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
    private final StudentRepository studentRepository;
    private final PaymentRepository paymentRepository;
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

        String systemPrompt = isAdminPhone(academy, phone)
                ? buildAdminSystemPrompt(academy)
                : buildSystemPrompt(academy);

        String reply = callAI(systemPrompt, buildMessages(history, userMessage));
        conversationStore.append(phone, "assistant", reply);
        return reply;
    }

    private boolean isAdminPhone(Academy academy, String phone) {
        if (academy.getWpAdminPhones() == null || academy.getWpAdminPhones().isBlank()) return false;
        String normalized = phone.replaceAll("[^0-9]", "");
        for (String admin : academy.getWpAdminPhones().split("[,;\\s]+")) {
            if (admin.replaceAll("[^0-9]", "").endsWith(normalized) || normalized.endsWith(admin.replaceAll("[^0-9]", "")))
                return true;
        }
        return false;
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
        body.put("max_tokens", 1024);
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

    // ── Admin system prompt ───────────────────────────────────────────────────

    private String buildAdminSystemPrompt(Academy academy) {
        Long academyId = academy.getId();
        java.time.LocalDate today = java.time.LocalDate.now();
        int currentMonth = today.getMonthValue();
        int currentYear = today.getYear();

        StringBuilder sb = new StringBuilder();
        sb.append(buildSystemPrompt(academy));
        sb.append("\n--- MODO ADMINISTRADOR ---\n");
        sb.append("Estás hablando con un ADMINISTRADOR. También tienes acceso a datos internos de alumnos.\n");
        sb.append("IMPORTANTE: Cuando pregunten por cinturones, peso, edad o pagos, usa SOLO la sección ALUMNOS ACTIVOS, no la de profesores.\n\n");

        List<Student> students = studentRepository.findByAcademyIdAndActiveTrue(academyId);
        List<Payment> monthPayments = paymentRepository.findByAcademyIdAndMonthAndYear(academyId, currentMonth, currentYear);
        java.util.Set<Long> paidIds = monthPayments.stream()
                .map(p -> p.getStudent().getId()).collect(java.util.stream.Collectors.toSet());

        String[] beltOrder = {"Blanco", "Amarillo", "Naranja", "Verde", "Azul", "Morado", "Marron", "Marrón", "Negro"};
        java.util.Map<String, Integer> beltRank = new java.util.HashMap<>();
        for (int i = 0; i < beltOrder.length; i++) beltRank.put(beltOrder[i].toLowerCase(), i);

        sb.append("ALUMNOS ACTIVOS (").append(students.size()).append(" total):\n");
        sb.append("Fecha actual: ").append(today).append(". Mes de referencia para pagos: ")
                .append(currentMonth).append("/").append(currentYear).append("\n\n");

        for (Student s : students) {
            sb.append("- ").append(s.getName());
            if (s.getAge() != null) sb.append(", ").append(s.getAge()).append(" años");
            if (s.getWeight() != null) sb.append(", ").append(s.getWeight()).append(" kg");
            if (s.getBelt() != null && !s.getBelt().isBlank()) {
                sb.append(", cinturón ").append(s.getBelt());
                if (s.getStripes() != null && s.getStripes() > 0)
                    sb.append(" (").append(s.getStripes()).append(" grado").append(s.getStripes() > 1 ? "s" : "").append(")");
            }
            sb.append(paidIds.contains(s.getId()) ? ", PAGÓ " : ", NO PAGÓ ")
              .append(currentMonth).append("/").append(currentYear);
            sb.append("\n");
        }

        sb.append("\nRESUMEN DE PAGOS ").append(currentMonth).append("/").append(currentYear).append(":\n");
        sb.append("- Pagaron: ").append(paidIds.size()).append(" alumnos\n");
        sb.append("- Deben: ").append(students.size() - paidIds.size()).append(" alumnos\n");

        return sb.toString();
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
            for (ClassSchedule s : schedules) {
                sb.append("- ").append(s.getDayOfWeek())
                        .append(" ").append(s.getStartTime())
                        .append(" a ").append(s.getEndTime())
                        .append(": ").append(s.getClassName()).append("\n");
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
