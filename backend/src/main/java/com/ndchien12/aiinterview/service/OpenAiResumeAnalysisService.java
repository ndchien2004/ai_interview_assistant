package com.ndchien12.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class OpenAiResumeAnalysisService implements ResumeAnalysisService {
    private static final int MAX_AI_INPUT_CHARS = 18_000;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final boolean aiEnabled;

    public OpenAiResumeAnalysisService(
            ObjectMapper objectMapper,
            @Value("${app.openai.api-key:${OPENAI_API_KEY:}}") String apiKey,
            @Value("${app.openai.model:${OPENAI_MODEL:gpt-5-mini}}") String model,
            @Value("${app.resume.ai-enabled:${RESUME_AI_ENABLED:true}}") boolean aiEnabled
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.aiEnabled = aiEnabled;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public ResumeAnalysisResult analyze(String extractedText) {
        if (!aiEnabled || apiKey == null || apiKey.isBlank()) {
            return fallbackAnalyze(extractedText, "AI analysis is disabled or OPENAI_API_KEY is not configured.");
        }

        try {
            String response = restClient.post()
                    .uri("/responses")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(requestBody(extractedText))
                    .retrieve()
                    .body(String.class);
            return parseResponse(response, extractedText);
        } catch (Exception exception) {
            return fallbackAnalyze(extractedText, "AI analysis failed; fallback extraction was used.");
        }
    }

    private Map<String, Object> requestBody(String extractedText) {
        return Map.of(
                "model", model,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(Map.of(
                                "type", "input_text",
                                "text", prompt(extractedText)
                        ))
                )),
                "text", Map.of(
                        "format", Map.of(
                                "type", "json_schema",
                                "name", "resume_analysis",
                                "strict", true,
                                "schema", schema()
                        )
                )
        );
    }

    private String prompt(String extractedText) {
        String safeText = extractedText.length() > MAX_AI_INPUT_CHARS
                ? extractedText.substring(0, MAX_AI_INPUT_CHARS)
                : extractedText;
        return """
                Analyze this resume text for an interview preparation app.
                Return JSON only. Extract only evidence present in the resume. Do not invent technologies, roles, or seniority.
                If the text is weak, ambiguous, or missing sections, include warnings.

                Resume text:
                %s
                """.formatted(safeText);
    }

    private Map<String, Object> schema() {
        Map<String, Object> stringArray = Map.of("type", "array", "items", Map.of("type", "string"));
        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of(
                        "parsedResumeText",
                        "summary",
                        "skills",
                        "roleSignals",
                        "senioritySignals",
                        "projectHighlights",
                        "warnings"
                ),
                "properties", Map.of(
                        "parsedResumeText", Map.of("type", "string"),
                        "summary", Map.of("type", "string"),
                        "skills", stringArray,
                        "roleSignals", stringArray,
                        "senioritySignals", stringArray,
                        "projectHighlights", stringArray,
                        "warnings", stringArray
                )
        );
    }

    private ResumeAnalysisResult parseResponse(String response, String extractedText) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String outputText = root.path("output_text").asText(null);

        if (outputText == null || outputText.isBlank()) {
            outputText = findOutputText(root);
        }
        if (outputText == null || outputText.isBlank()) {
            throw new IllegalStateException("OpenAI response did not contain output text");
        }

        JsonNode json = objectMapper.readTree(outputText);
        return new ResumeAnalysisResult(
                nonBlank(json.path("parsedResumeText").asText(), extractedText),
                json.path("summary").asText(""),
                array(json.path("skills")),
                array(json.path("roleSignals")),
                array(json.path("senioritySignals")),
                array(json.path("projectHighlights")),
                array(json.path("warnings"))
        );
    }

    private String findOutputText(JsonNode root) {
        for (JsonNode output : root.path("output")) {
            for (JsonNode content : output.path("content")) {
                String text = content.path("text").asText(null);
                if (text != null && !text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    private ResumeAnalysisResult fallbackAnalyze(String extractedText, String warning) {
        List<String> skills = inferSkills(extractedText);
        List<String> roleSignals = inferRoleSignals(extractedText);
        return new ResumeAnalysisResult(
                extractedText,
                summarize(extractedText),
                skills,
                roleSignals,
                List.of(),
                List.of(),
                List.of(warning)
        );
    }

    private List<String> inferSkills(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        List<String> knownSkills = List.of(
                "Java", "Spring Boot", "React", "Next.js", "TypeScript", "JavaScript",
                "PostgreSQL", "MySQL", "Docker", "REST APIs", "JWT", "Tailwind CSS",
                "AWS", "Git", "Redis", "Kafka", "Microservices", "JUnit"
        );
        Set<String> matched = new LinkedHashSet<>();
        for (String skill : knownSkills) {
            if (lower.contains(skill.toLowerCase(Locale.ROOT))) {
                matched.add(skill);
            }
        }
        return new ArrayList<>(matched);
    }

    private List<String> inferRoleSignals(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        List<String> signals = new ArrayList<>();
        if (lower.contains("frontend") || lower.contains("react") || lower.contains("next.js")) {
            signals.add("Frontend");
        }
        if (lower.contains("backend") || lower.contains("spring") || lower.contains("api")) {
            signals.add("Backend");
        }
        if (lower.contains("full-stack") || lower.contains("fullstack")) {
            signals.add("Full-stack");
        }
        if (lower.contains("docker") || lower.contains("aws") || lower.contains("deploy")) {
            signals.add("Deployment");
        }
        return signals;
    }

    private String summarize(String text) {
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 420) {
            return normalized;
        }
        return normalized.substring(0, 420).trim() + "...";
    }

    private List<String> array(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (!node.isArray()) {
            return values;
        }
        node.forEach(item -> {
            String value = item.asText("").trim();
            if (!value.isBlank()) {
                values.add(value);
            }
        });
        return values;
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
