package com.ndchien12.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.dto.interview.RealtimeSessionResponse;
import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.Resume;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiRealtimeService {
    private static final int MAX_CONTEXT_CHARS = 10_000;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String openAiApiKey;
    private final String realtimeModel;
    private final String realtimeVoice;
    private final boolean realtimeEnabled;

    public OpenAiRealtimeService(
            ObjectMapper objectMapper,
            @Value("${app.openai.api-key:${OPENAI_API_KEY:}}") String openAiApiKey,
            @Value("${app.openai.realtime-model:${OPENAI_REALTIME_MODEL:gpt-realtime}}") String realtimeModel,
            @Value("${app.openai.realtime-voice:${OPENAI_REALTIME_VOICE:marin}}") String realtimeVoice,
            @Value("${app.openai.realtime-enabled:${OPENAI_REALTIME_ENABLED:false}}") boolean realtimeEnabled
    ) {
        this.objectMapper = objectMapper;
        this.openAiApiKey = openAiApiKey;
        this.realtimeModel = realtimeModel;
        this.realtimeVoice = realtimeVoice;
        this.realtimeEnabled = realtimeEnabled;
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public RealtimeSessionResponse createClientSecret(
            InterviewSession session,
            Resume resume,
            List<InterviewQuestion> questions
    ) {
        if (!realtimeEnabled) {
            return RealtimeSessionResponse.disabled(realtimeModel, realtimeVoice, "Realtime voice is disabled.");
        }
        if (!hasText(openAiApiKey)) {
            return RealtimeSessionResponse.disabled(realtimeModel, realtimeVoice, "OPENAI_API_KEY is not configured.");
        }

        try {
            String response = restClient.post()
                    .uri("https://api.openai.com/v1/realtime/client_secrets")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiApiKey)
                    .body(requestBody(session, resume, questions))
                    .retrieve()
                    .body(String.class);
            String clientSecret = parseClientSecret(response);
            if (!hasText(clientSecret)) {
                return RealtimeSessionResponse.disabled(realtimeModel, realtimeVoice, "OpenAI did not return a realtime client secret.");
            }
            return new RealtimeSessionResponse(true, clientSecret, realtimeModel, realtimeVoice, null);
        } catch (Exception exception) {
            return RealtimeSessionResponse.disabled(realtimeModel, realtimeVoice, "Unable to create realtime session: " + safeReason(exception));
        }
    }

    private Map<String, Object> requestBody(
            InterviewSession session,
            Resume resume,
            List<InterviewQuestion> questions
    ) {
        return Map.of(
                "session", Map.of(
                        "type", "realtime",
                        "model", realtimeModel,
                        "instructions", compactInstructions(session, resume, questions),
                        "max_output_tokens", 700,
                        "audio", Map.of(
                                "input", Map.of(
                                        "turn_detection", Map.of(
                                                "type", "server_vad",
                                                "threshold", 0.5,
                                                "prefix_padding_ms", 300,
                                                "silence_duration_ms", 650,
                                                "interrupt_response", true,
                                                "create_response", true
                                        ),
                                        "transcription", Map.of(
                                                "model", "gpt-4o-mini-transcribe"
                                        ),
                                        "noise_reduction", Map.of(
                                                "type", "near_field"
                                        )
                                ),
                                "output", Map.of(
                                        "voice", realtimeVoice,
                                        "speed", 1.03
                                )
                        )
                )
        );
    }

    private String compactInstructions(
            InterviewSession session,
            Resume resume,
            List<InterviewQuestion> questions
    ) {
        StringBuilder builder = new StringBuilder();
        builder.append(loadRules()).append("\n\n");
        builder.append("Session context:\n");
        builder.append("- Target role: ").append(safeString(session.getTargetRole())).append('\n');
        builder.append("- Seniority: ").append(safeString(session.getSeniority())).append('\n');
        builder.append("- Domain: ").append(safeString(session.getDomain())).append('\n');
        builder.append("- Evaluation skills: ").append(join(session.getEvaluationSkills(), 8)).append('\n');
        builder.append("- Focus areas: ").append(join(session.getFocusAreas(), 8)).append('\n');
        builder.append("- Resume summary: ").append(truncate(safeString(resume.getSummary()), 1200)).append('\n');
        builder.append("- Resume skills: ").append(join(resume.getSkills(), 16)).append('\n');
        builder.append("- Project highlights: ").append(join(resume.getProjectHighlights(), 8)).append("\n\n");
        builder.append("Generated question sequence and expected signals:\n");

        questions.stream()
                .sorted(Comparator.comparingInt(InterviewQuestion::getSortOrder))
                .forEach(question -> {
                    builder.append(question.getSortOrder()).append(". ");
                    builder.append(truncate(safeString(question.getPrompt()), 900)).append('\n');
                    builder.append("   Expected signals: ").append(join(question.getExpectedSignals(), 8)).append('\n');
                });

        builder.append("\nInteraction protocol:\n");
        builder.append("- Begin with a short greeting and ask question 1.\n");
        builder.append("- Wait for the candidate to answer by voice.\n");
        builder.append("- Keep each response under 2 short sentences unless clarifying.\n");
        builder.append("- When prompted by the app to move next, ask the next numbered question.\n");
        builder.append("- Do not give the final score in the live call.\n");

        return truncate(builder.toString(), MAX_CONTEXT_CHARS);
    }

    private String loadRules() {
        try {
            return StreamUtils.copyToString(
                    new ClassPathResource("interview-live-rules.md").getInputStream(),
                    StandardCharsets.UTF_8
            );
        } catch (Exception exception) {
            return "You are a concise senior AI interviewer. Ask one grounded question at a time and keep replies short.";
        }
    }

    private String parseClientSecret(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String value = root.path("value").asText("");
        if (hasText(value)) {
            return value;
        }
        value = root.path("client_secret").path("value").asText("");
        if (hasText(value)) {
            return value;
        }
        return root.path("session").path("client_secret").path("value").asText("");
    }

    private String join(List<String> values, int limit) {
        if (values == null || values.isEmpty()) {
            return "none";
        }
        List<String> cleaned = new ArrayList<>();
        for (String value : values) {
            String text = safeString(value);
            if (!text.isBlank() && !cleaned.contains(text)) {
                cleaned.add(text);
            }
            if (cleaned.size() >= limit) {
                break;
            }
        }
        return cleaned.isEmpty() ? "none" : String.join(", ", cleaned);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeReason(Exception exception) {
        String message = exception.getMessage();
        return hasText(message) ? truncate(message, 180) : exception.getClass().getSimpleName();
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).trim() + "...";
    }
}
