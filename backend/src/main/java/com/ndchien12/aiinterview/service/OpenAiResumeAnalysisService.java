package com.ndchien12.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class OpenAiResumeAnalysisService implements ResumeAnalysisService {
    private static final Logger log = LoggerFactory.getLogger(OpenAiResumeAnalysisService.class);
    private static final int MAX_AI_INPUT_CHARS = 18_000;
    private static final Set<String> STOPWORDS = Set.of(
            "and", "the", "for", "with", "from", "this", "that", "have", "has", "was", "were",
            "are", "role", "work", "used", "using", "user", "users", "data", "system", "project",
            "application", "app", "service", "services", "development", "experience"
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String geminiApiKey;
    private final String geminiModel;
    private final boolean aiEnabled;
    private final String resumeAnalysisRules;

    public OpenAiResumeAnalysisService(
            ObjectMapper objectMapper,
            @Value("${app.openai.api-key:${OPENAI_API_KEY:}}") String openAiApiKey,
            @Value("${app.openai.model:${OPENAI_MODEL:gpt-5-mini}}") String openAiModel,
            @Value("${app.gemini.api-key:${GEMINI_API_KEY:}}") String geminiApiKey,
            @Value("${app.gemini.model:${GEMINI_MODEL:gemini-2.5-flash}}") String geminiModel,
            @Value("${app.resume.ai-enabled:${RESUME_AI_ENABLED:true}}") boolean aiEnabled
    ) {
        this.objectMapper = objectMapper;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
        this.aiEnabled = aiEnabled;
        this.resumeAnalysisRules = loadResumeAnalysisRules();
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public ResumeAnalysisResult analyze(String extractedText) {
        if (!aiEnabled) {
            return fallbackAnalyze(extractedText, "AI analysis is disabled.");
        }

        List<String> failures = new ArrayList<>();

        if (hasText(openAiApiKey)) {
            try {
                return analyzeWithOpenAi(extractedText);
            } catch (Exception exception) {
                log.warn("OpenAI resume analysis failed for model {}: {}", openAiModel, exception.getMessage());
                failures.add("OpenAI: " + safeReason(exception));
            }
        } else {
            failures.add("OpenAI: OPENAI_API_KEY is not configured.");
        }

        if (hasText(geminiApiKey)) {
            try {
                return analyzeWithGemini(extractedText);
            } catch (Exception exception) {
                log.warn("Gemini resume analysis failed for model {}: {}", geminiModel, exception.getMessage());
                failures.add("Gemini: " + safeReason(exception));
            }
        } else {
            failures.add("Gemini: GEMINI_API_KEY is not configured.");
        }

        return fallbackAnalyze(extractedText, "AI fallback used. " + truncate(String.join(" ", failures), 220));
    }

    private ResumeAnalysisResult analyzeWithOpenAi(String extractedText) throws Exception {
        String response = restClient.post()
                .uri("https://api.openai.com/v1/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiApiKey)
                .body(openAiRequestBody(extractedText))
                .retrieve()
                .body(String.class);
        return parseOpenAiResponse(response, extractedText);
    }

    private ResumeAnalysisResult analyzeWithGemini(String extractedText) throws Exception {
        String response = restClient.post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                        geminiModel,
                        geminiApiKey)
                .body(geminiRequestBody(extractedText))
                .retrieve()
                .body(String.class);
        return parseGeminiResponse(response, extractedText);
    }

    private Map<String, Object> openAiRequestBody(String extractedText) {
        return Map.of(
                "model", openAiModel,
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
                                "schema", openAiSchema()
                        )
                )
        );
    }

    private Map<String, Object> geminiRequestBody(String extractedText) {
        return Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt(extractedText)))
                )),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", geminiSchema()
                )
        );
    }

    private Map<String, Object> openAiSchema() {
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

    private Map<String, Object> geminiSchema() {
        Map<String, Object> stringArray = Map.of("type", "ARRAY", "items", Map.of("type", "STRING"));
        return Map.of(
                "type", "OBJECT",
                "required", List.of(
                        "parsedResumeText",
                        "summary",
                        "skills",
                        "roleSignals",
                        "senioritySignals",
                        "projectHighlights",
                        "warnings"
                ),
                "propertyOrdering", List.of(
                        "parsedResumeText",
                        "summary",
                        "skills",
                        "roleSignals",
                        "senioritySignals",
                        "projectHighlights",
                        "warnings"
                ),
                "properties", Map.of(
                        "parsedResumeText", Map.of("type", "STRING"),
                        "summary", Map.of("type", "STRING"),
                        "skills", stringArray,
                        "roleSignals", stringArray,
                        "senioritySignals", stringArray,
                        "projectHighlights", stringArray,
                        "warnings", stringArray
                )
        );
    }

    private ResumeAnalysisResult parseOpenAiResponse(String response, String extractedText) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String outputText = root.path("output_text").asText(null);

        if (outputText == null || outputText.isBlank()) {
            outputText = findOpenAiOutputText(root);
        }
        if (outputText == null || outputText.isBlank()) {
            throw new IllegalStateException("OpenAI response did not contain output text");
        }

        return parseAnalysisJson(outputText, extractedText);
    }

    private ResumeAnalysisResult parseGeminiResponse(String response, String extractedText) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String outputText = null;

        for (JsonNode candidate : root.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                String text = part.path("text").asText(null);
                if (text != null && !text.isBlank()) {
                    outputText = text;
                    break;
                }
            }
            if (outputText != null) {
                break;
            }
        }

        if (outputText == null || outputText.isBlank()) {
            throw new IllegalStateException("Gemini response did not contain output text");
        }

        return parseAnalysisJson(outputText, extractedText);
    }

    private ResumeAnalysisResult parseAnalysisJson(String outputText, String extractedText) throws Exception {
        JsonNode json = objectMapper.readTree(outputText);
        ResumeAnalysisResult aiResult = new ResumeAnalysisResult(
                cleanParsedResumeText(text(json.path("parsedResumeText")), extractedText),
                compactSummary(text(json.path("summary")), extractedText),
                array(json.path("skills")),
                array(json.path("roleSignals")),
                array(json.path("senioritySignals")),
                array(json.path("projectHighlights")),
                array(json.path("warnings"))
        );
        return groundAnalysis(aiResult, extractedText);
    }

    private String prompt(String extractedText) {
        String safeText = extractedText.length() > MAX_AI_INPUT_CHARS
                ? extractedText.substring(0, MAX_AI_INPUT_CHARS)
                : extractedText;
        return """
                Analyze this resume text for an interview preparation app.
                Follow the rules below exactly.

                Rules:
                %s

                Resume text:
                %s
                """.formatted(resumeAnalysisRules, safeText);
    }

    private String findOpenAiOutputText(JsonNode root) {
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

    private ResumeAnalysisResult groundAnalysis(ResumeAnalysisResult aiResult, String extractedText) {
        List<String> groundedAiSkills = groundedOnly(aiResult.skills(), extractedText);
        List<String> groundedAiRoleSignals = groundedOnly(aiResult.roleSignals(), extractedText);
        List<String> skills = mergeDistinct(
                groundedAiSkills,
                inferSkills(extractedText)
        );
        List<String> roleSignals = mergeDistinct(
                groundedAiRoleSignals,
                inferRoleSignals(extractedText)
        );
        List<String> senioritySignals = groundedOnly(aiResult.senioritySignals(), extractedText);
        List<String> projectHighlights = groundedOnly(aiResult.projectHighlights(), extractedText);
        List<String> warnings = new ArrayList<>(aiResult.warnings());

        int originalCount = size(aiResult.skills())
                + size(aiResult.roleSignals())
                + size(aiResult.senioritySignals())
                + size(aiResult.projectHighlights());
        int groundedCount = groundedAiSkills.size() + groundedAiRoleSignals.size() + senioritySignals.size() + projectHighlights.size();
        if (groundedCount < originalCount) {
            warnings.add("Some AI suggestions were removed because they were not supported by the resume text.");
        }

        return new ResumeAnalysisResult(
                cleanParsedResumeText(aiResult.parsedResumeText(), extractedText),
                compactSummary(aiResult.summary(), extractedText),
                skills,
                roleSignals,
                senioritySignals,
                projectHighlights,
                warnings
        );
    }

    private int size(List<String> values) {
        return values == null ? 0 : values.size();
    }

    private List<String> mergeDistinct(List<String> primary, List<String> secondary) {
        Set<String> values = new LinkedHashSet<>();
        if (primary != null) {
            values.addAll(primary);
        }
        if (secondary != null) {
            values.addAll(secondary);
        }
        return new ArrayList<>(values);
    }

    private List<String> groundedOnly(List<String> values, String extractedText) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        List<String> grounded = new ArrayList<>();
        for (String value : values) {
            String cleanValue = value == null ? "" : value.trim();
            if (!cleanValue.isBlank() && hasGrounding(cleanValue, extractedText)) {
                grounded.add(cleanValue);
            }
        }
        return grounded.stream().distinct().toList();
    }

    private boolean hasGrounding(String value, String extractedText) {
        String normalizedText = normalizeForMatch(extractedText);
        String normalizedValue = normalizeForMatch(value);
        if (normalizedValue.length() >= 2 && normalizedText.contains(normalizedValue)) {
            return true;
        }

        List<String> tokens = significantTokens(value);
        if (tokens.isEmpty()) {
            return false;
        }

        long matched = tokens.stream()
                .filter(token -> normalizedText.contains(token))
                .count();
        int requiredMatches = Math.min(2, tokens.size());
        return matched >= requiredMatches;
    }

    private String normalizeForMatch(String value) {
        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]+", "");
    }

    private List<String> significantTokens(String value) {
        String[] rawTokens = value == null
                ? new String[0]
                : value.toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+");
        List<String> tokens = new ArrayList<>();
        for (String token : rawTokens) {
            if (token.length() >= 3 && !STOPWORDS.contains(token)) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeReason(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return truncate(message, 180);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).trim() + "...";
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
        String normalized = cleanDisplayText(text).replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 360) {
            return normalized;
        }
        int sentenceEnd = Math.max(
                Math.max(normalized.lastIndexOf(". ", 360), normalized.lastIndexOf("! ", 360)),
                normalized.lastIndexOf("? ", 360)
        );
        if (sentenceEnd >= 160) {
            return normalized.substring(0, sentenceEnd + 1).trim();
        }
        return normalized.substring(0, 360).trim() + "...";
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

    private String text(JsonNode node) {
        return node == null ? "" : node.asText("");
    }

    private String cleanParsedResumeText(String value, String fallback) {
        String cleaned = formatResumeText(cleanDisplayText(value));
        if (cleaned.length() < 80) {
            cleaned = formatResumeText(cleanDisplayText(fallback));
        }

        return cleaned
                .replaceAll("(?m)^\\s*[-*\u2022]\\s{0,2}$", "")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private String compactSummary(String value, String fallback) {
        String cleaned = cleanDisplayText(value)
                .replaceAll("(?m)^\\s*[-*\u2022]\\s*", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (cleaned.length() < 40) {
            return summarize(fallback);
        }

        return summarize(cleaned);
    }

    private String cleanDisplayText(String value) {
        if (value == null) {
            return "";
        }

        return Normalizer.normalize(value, Normalizer.Form.NFC)
                .replace('\u00A0', ' ')
                .replace("\uFFFD", "")
                .replaceAll("\\r\\n?", "\n")
                .replaceAll("[\\t\\x0B\\f]+", " ")
                .replaceAll("[\\u200B\\u200C\\u200D]", "")
                .replaceAll("(?m)[ ]{2,}", " ")
                .replaceAll("(?m)^\\s+", "")
                .replaceAll("(?m)\\s+$", "")
                .trim();
    }

    private String formatResumeText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String formatted = value
                .replaceAll("[\\u25A1\\u25AA\\u2022]", "\n- ")
                .replaceAll("([a-z0-9)])([A-Z][A-Z ]{4,})(?=[A-Z][a-z]|\\s|$)", "$1\n\n$2")
                .replaceAll("(20XX|20\\d{2}|Present)([A-Z])", "$1\n$2")
                .replaceAll("([a-z)])(Bachelor|Master|Associate|Languages|Tools and Software|Operating Systems|Trainee|Sales Associate)\\b", "$1\n$2")
                .replaceAll("([.!?])\\s+(?=[A-Z][a-z]+:)", "$1\n");

        List<String> headings = List.of(
                "EDUCATION",
                "TECHNICAL SKILLS",
                "SKILLS",
                "RELEVANT INFORMATION TECHNOLOGY PROJECTS",
                "PROJECTS",
                "RELEVANT TRAINING",
                "TRAINING",
                "WORK HISTORY",
                "EXPERIENCE",
                "CERTIFICATIONS",
                "SUMMARY"
        );

        for (String heading : headings) {
            formatted = formatted.replaceAll("(?i)\\s*(" + java.util.regex.Pattern.quote(heading) + ")\\s*", "\n\n$1\n");
        }

        return formatted
                .replaceAll("[ \\t]+", " ")
                .replaceAll(" ?\\| ?", " | ")
                .replaceAll("\\n[ \\t]+", "\n")
                .replaceAll("[ \\t]+\\n", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    private String loadResumeAnalysisRules() {
        try {
            return new ClassPathResource("resume-analysis-rules.md")
                    .getContentAsString(StandardCharsets.UTF_8)
                    .trim();
        } catch (IOException exception) {
            log.warn("Unable to load resume analysis rules: {}", exception.getMessage());
            return "Return JSON only. Keep summary short. Preserve only evidence present in the resume.";
        }
    }
}
