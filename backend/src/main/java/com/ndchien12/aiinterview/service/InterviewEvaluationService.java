package com.ndchien12.aiinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ndchien12.aiinterview.entity.InterviewAnswer;
import com.ndchien12.aiinterview.entity.InterviewEvaluationMode;
import com.ndchien12.aiinterview.entity.InterviewEvaluationProvider;
import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.Resume;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class InterviewEvaluationService {
    private static final Logger log = LoggerFactory.getLogger(InterviewEvaluationService.class);
    private static final int MAX_PROMPT_CHARS = 24_000;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String geminiApiKey;
    private final String geminiModel;
    private final boolean aiEnabled;

    public InterviewEvaluationService(
            ObjectMapper objectMapper,
            @Value("${app.openai.api-key:${OPENAI_API_KEY:}}") String openAiApiKey,
            @Value("${app.openai.model:${OPENAI_MODEL:gpt-5-mini}}") String openAiModel,
            @Value("${app.gemini.api-key:${GEMINI_API_KEY:}}") String geminiApiKey,
            @Value("${app.gemini.model:${GEMINI_MODEL:gemini-2.5-flash}}") String geminiModel,
            @Value("${app.interview.ai-enabled:${INTERVIEW_AI_ENABLED:true}}") boolean aiEnabled
    ) {
        this.objectMapper = objectMapper;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
        this.aiEnabled = aiEnabled;
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public EvaluationDraft evaluate(
            InterviewSession session,
            Resume resume,
            List<InterviewQuestion> questions,
            List<InterviewAnswer> answers
    ) {
        EvaluationContext context = toContext(session, resume, questions, answers);
        if (!aiEnabled) {
            return fallback(context, "AI interview evaluation is disabled.");
        }

        List<String> failures = new ArrayList<>();
        if (hasText(openAiApiKey)) {
            try {
                return evaluateWithOpenAi(context);
            } catch (Exception exception) {
                log.warn("OpenAI interview evaluation failed for model {}: {}", openAiModel, exception.getMessage());
                failures.add("OpenAI: " + safeReason(exception));
            }
        } else {
            failures.add("OpenAI: OPENAI_API_KEY is not configured.");
        }

        if (hasText(geminiApiKey)) {
            try {
                return evaluateWithGemini(context);
            } catch (Exception exception) {
                log.warn("Gemini interview evaluation failed for model {}: {}", geminiModel, exception.getMessage());
                failures.add("Gemini: " + safeReason(exception));
            }
        } else {
            failures.add("Gemini: GEMINI_API_KEY is not configured.");
        }

        return fallback(context, "AI provider unavailable. " + truncate(String.join(" ", failures), 240));
    }

    private EvaluationDraft evaluateWithOpenAi(EvaluationContext context) throws Exception {
        String response = restClient.post()
                .uri("https://api.openai.com/v1/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiApiKey)
                .body(openAiRequestBody(context))
                .retrieve()
                .body(String.class);
        return parseOpenAiResponse(response, InterviewEvaluationProvider.OPENAI, openAiModel);
    }

    private EvaluationDraft evaluateWithGemini(EvaluationContext context) throws Exception {
        String response = restClient.post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                        geminiModel,
                        geminiApiKey)
                .body(geminiRequestBody(context))
                .retrieve()
                .body(String.class);
        return parseGeminiResponse(response, InterviewEvaluationProvider.GEMINI, geminiModel);
    }

    private Map<String, Object> openAiRequestBody(EvaluationContext context) throws Exception {
        return Map.of(
                "model", openAiModel,
                "input", List.of(Map.of(
                        "role", "user",
                        "content", List.of(Map.of(
                                "type", "input_text",
                                "text", prompt(context)
                        ))
                )),
                "text", Map.of(
                        "format", Map.of(
                                "type", "json_schema",
                                "name", "interview_evaluation",
                                "strict", true,
                                "schema", openAiSchema()
                        )
                )
        );
    }

    private Map<String, Object> geminiRequestBody(EvaluationContext context) throws Exception {
        return Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt(context)))
                )),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", geminiSchema()
                )
        );
    }

    private String prompt(EvaluationContext context) throws Exception {
        String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(context);
        String truncated = truncate(json, MAX_PROMPT_CHARS);
        return """
                You are a senior technical interviewer. Evaluate the candidate's written mock interview answers.
                Be specific, fair, and grounded only in the provided resume/session/questions/answers.
                Score 0-100. Penalize blank, vague, or non-specific answers. Reward concrete tradeoffs, CV evidence, outcomes, and production awareness.
                Return only valid JSON matching the schema.

                Evaluation context:
                %s
                """.formatted(truncated);
    }

    private Map<String, Object> openAiSchema() {
        Map<String, Object> stringArray = Map.of("type", "array", "items", Map.of("type", "string"));
        Map<String, Object> scoreObject = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("technical", "communication", "experience", "problemSolving"),
                "properties", Map.of(
                        "technical", integerSchema(),
                        "communication", integerSchema(),
                        "experience", integerSchema(),
                        "problemSolving", integerSchema()
                )
        );
        Map<String, Object> feedbackItem = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("questionId", "score", "rationale", "missingSignals", "suggestedAnswer"),
                "properties", Map.of(
                        "questionId", Map.of("type", "string"),
                        "score", integerSchema(),
                        "rationale", Map.of("type", "string"),
                        "missingSignals", stringArray,
                        "suggestedAnswer", Map.of("type", "string")
                )
        );
        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of(
                        "totalScore",
                        "categoryScores",
                        "strengths",
                        "weaknesses",
                        "improvementRoadmap",
                        "summary",
                        "perQuestionFeedback"
                ),
                "properties", Map.of(
                        "totalScore", integerSchema(),
                        "categoryScores", scoreObject,
                        "strengths", stringArray,
                        "weaknesses", stringArray,
                        "improvementRoadmap", stringArray,
                        "summary", Map.of("type", "string"),
                        "perQuestionFeedback", Map.of("type", "array", "items", feedbackItem)
                )
        );
    }

    private Map<String, Object> geminiSchema() {
        Map<String, Object> stringArray = Map.of("type", "ARRAY", "items", Map.of("type", "STRING"));
        Map<String, Object> scoreObject = Map.of(
                "type", "OBJECT",
                "required", List.of("technical", "communication", "experience", "problemSolving"),
                "propertyOrdering", List.of("technical", "communication", "experience", "problemSolving"),
                "properties", Map.of(
                        "technical", Map.of("type", "INTEGER"),
                        "communication", Map.of("type", "INTEGER"),
                        "experience", Map.of("type", "INTEGER"),
                        "problemSolving", Map.of("type", "INTEGER")
                )
        );
        Map<String, Object> feedbackItem = Map.of(
                "type", "OBJECT",
                "required", List.of("questionId", "score", "rationale", "missingSignals", "suggestedAnswer"),
                "propertyOrdering", List.of("questionId", "score", "rationale", "missingSignals", "suggestedAnswer"),
                "properties", Map.of(
                        "questionId", Map.of("type", "STRING"),
                        "score", Map.of("type", "INTEGER"),
                        "rationale", Map.of("type", "STRING"),
                        "missingSignals", stringArray,
                        "suggestedAnswer", Map.of("type", "STRING")
                )
        );
        return Map.of(
                "type", "OBJECT",
                "required", List.of(
                        "totalScore",
                        "categoryScores",
                        "strengths",
                        "weaknesses",
                        "improvementRoadmap",
                        "summary",
                        "perQuestionFeedback"
                ),
                "propertyOrdering", List.of(
                        "totalScore",
                        "categoryScores",
                        "strengths",
                        "weaknesses",
                        "improvementRoadmap",
                        "summary",
                        "perQuestionFeedback"
                ),
                "properties", Map.of(
                        "totalScore", Map.of("type", "INTEGER"),
                        "categoryScores", scoreObject,
                        "strengths", stringArray,
                        "weaknesses", stringArray,
                        "improvementRoadmap", stringArray,
                        "summary", Map.of("type", "STRING"),
                        "perQuestionFeedback", Map.of("type", "ARRAY", "items", feedbackItem)
                )
        );
    }

    private Map<String, Object> integerSchema() {
        return Map.of("type", "integer", "minimum", 0, "maximum", 100);
    }

    private EvaluationDraft parseOpenAiResponse(
            String response,
            InterviewEvaluationProvider provider,
            String model
    ) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String outputText = root.path("output_text").asText(null);
        if (!hasText(outputText)) {
            outputText = findOpenAiOutputText(root);
        }
        if (!hasText(outputText)) {
            throw new IllegalStateException("OpenAI response did not contain output text");
        }
        return parseEvaluationJson(outputText, provider, model);
    }

    private EvaluationDraft parseGeminiResponse(
            String response,
            InterviewEvaluationProvider provider,
            String model
    ) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        String outputText = null;
        for (JsonNode candidate : root.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                String text = part.path("text").asText(null);
                if (hasText(text)) {
                    outputText = text;
                    break;
                }
            }
            if (hasText(outputText)) {
                break;
            }
        }
        if (!hasText(outputText)) {
            throw new IllegalStateException("Gemini response did not contain output text");
        }
        return parseEvaluationJson(outputText, provider, model);
    }

    private EvaluationDraft parseEvaluationJson(
            String outputText,
            InterviewEvaluationProvider provider,
            String model
    ) throws Exception {
        JsonNode root = objectMapper.readTree(outputText);
        JsonNode categoryScores = root.path("categoryScores");
        return new EvaluationDraft(
                clamp(root.path("totalScore").asInt(0)),
                clamp(categoryScores.path("technical").asInt(0)),
                clamp(categoryScores.path("communication").asInt(0)),
                clamp(categoryScores.path("experience").asInt(0)),
                clamp(categoryScores.path("problemSolving").asInt(0)),
                strings(root.path("strengths"), 4),
                strings(root.path("weaknesses"), 4),
                strings(root.path("improvementRoadmap"), 5),
                safeString(root.path("summary").asText("")),
                InterviewEvaluationMode.AI,
                provider,
                model,
                feedback(root.path("perQuestionFeedback"))
        );
    }

    private List<QuestionFeedbackDraft> feedback(JsonNode node) {
        List<QuestionFeedbackDraft> items = new ArrayList<>();
        if (!node.isArray()) {
            return items;
        }
        int sortOrder = 1;
        for (JsonNode item : node) {
            UUID questionId = parseUuid(item.path("questionId").asText(""));
            if (questionId == null) {
                continue;
            }
            items.add(new QuestionFeedbackDraft(
                    questionId,
                    clamp(item.path("score").asInt(0)),
                    safeString(item.path("rationale").asText("")),
                    strings(item.path("missingSignals"), 6),
                    safeString(item.path("suggestedAnswer").asText("")),
                    sortOrder++
            ));
        }
        return items;
    }

    private EvaluationDraft fallback(EvaluationContext context, String reason) {
        int answeredCount = (int) context.questions().stream()
                .filter(question -> hasText(question.answer()))
                .count();
        int averageLength = context.questions().isEmpty()
                ? 0
                : (int) context.questions().stream()
                .mapToInt(question -> question.answer().trim().length())
                .average()
                .orElse(0);
        int completeness = Math.round((answeredCount * 100f) / Math.max(context.questions().size(), 1));
        int detailScore = Math.min(92, 48 + averageLength / 10);
        int totalScore = Math.max(25, Math.round(detailScore * 0.62f + completeness * 0.38f));

        List<QuestionFeedbackDraft> feedback = new ArrayList<>();
        int sortOrder = 1;
        for (QuestionEvaluationInput question : context.questions()) {
            boolean answered = hasText(question.answer());
            int answerLength = question.answer().trim().length();
            int score = answered ? Math.min(88, 45 + answerLength / 8) : 15;
            List<String> missingSignals = missingSignals(question);
            feedback.add(new QuestionFeedbackDraft(
                    question.id(),
                    score,
                    answered
                            ? "Local fallback detected a usable answer. Strengthen it with clearer evidence, explicit tradeoffs, and measurable outcomes."
                            : "No substantial answer was provided for this question.",
                    missingSignals,
                    suggestedAnswer(question, missingSignals),
                    sortOrder++
            ));
        }

        String summary = "Fallback evaluation generated because AI scoring was unavailable. " + reason;
        return new EvaluationDraft(
                totalScore,
                Math.min(95, totalScore + 3),
                Math.max(35, totalScore - 4),
                Math.min(94, totalScore + 1),
                Math.min(96, totalScore + 5),
                List.of(
                        "Uses the selected role and resume context where answers are present.",
                        "Shows practice momentum by completing part of the interview flow."
                ),
                List.of(
                        "Add more concrete project evidence and measurable outcomes.",
                        "Answer every generated question before submitting for the strongest signal."
                ),
                List.of(
                        "Use a concise STAR structure for experience answers.",
                        "Mention technical tradeoffs, failure modes, testing, and production constraints.",
                        "Tie each answer back to " + String.join(", ", context.focusAreas()) + "."
                ),
                summary,
                InterviewEvaluationMode.FALLBACK,
                InterviewEvaluationProvider.LOCAL,
                "local",
                feedback
        );
    }

    private List<String> missingSignals(QuestionEvaluationInput question) {
        if (!hasText(question.answer())) {
            return question.expectedSignals().stream().limit(4).toList();
        }
        String answer = question.answer().toLowerCase(Locale.ROOT);
        return question.expectedSignals().stream()
                .filter(signal -> !answer.contains(signal.toLowerCase(Locale.ROOT)))
                .limit(4)
                .toList();
    }

    private String suggestedAnswer(QuestionEvaluationInput question, List<String> missingSignals) {
        String missing = missingSignals.isEmpty()
                ? "the strongest expected signals"
                : String.join(", ", missingSignals);
        return "Start with a direct conclusion, give a concrete CV/project example, explain tradeoffs, cover " + missing + ", and close with the outcome or metric.";
    }

    private EvaluationContext toContext(
            InterviewSession session,
            Resume resume,
            List<InterviewQuestion> questions,
            List<InterviewAnswer> answers
    ) {
        Map<UUID, String> answersByQuestion = new HashMap<>();
        answers.forEach(answer -> answersByQuestion.put(answer.getQuestion().getId(), safeString(answer.getResponse())));
        List<QuestionEvaluationInput> questionInputs = questions.stream()
                .sorted(Comparator.comparingInt(InterviewQuestion::getSortOrder))
                .map(question -> new QuestionEvaluationInput(
                        question.getId(),
                        question.getPrompt(),
                        question.getCategory().name(),
                        question.getDifficulty().name(),
                        new ArrayList<>(question.getExpectedSignals()),
                        answersByQuestion.getOrDefault(question.getId(), "")
                ))
                .toList();
        return new EvaluationContext(
                session.getId(),
                session.getTargetRole(),
                session.getSeniority(),
                safeString(session.getSourceResumeSummary()),
                cleanList(session.getFocusAreas()),
                cleanList(session.getQuestionPlan()),
                safeString(resume.getParsedText()),
                cleanList(resume.getSkills()),
                cleanList(resume.getRoleSignals()),
                cleanList(resume.getProjectHighlights()),
                questionInputs
        );
    }

    private List<String> strings(JsonNode node, int maxItems) {
        if (!node.isArray()) {
            return List.of();
        }
        LinkedHashSet<String> values = new LinkedHashSet<>();
        for (JsonNode item : node) {
            String value = safeString(item.asText(""));
            if (!value.isBlank()) {
                values.add(truncate(value, 500));
            }
            if (values.size() >= maxItems) {
                break;
            }
        }
        return new ArrayList<>(values);
    }

    private String findOpenAiOutputText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isObject()) {
            String type = node.path("type").asText("");
            String text = node.path("text").asText(null);
            if (("output_text".equals(type) || "text".equals(type)) && hasText(text)) {
                return text;
            }
            for (JsonNode child : node) {
                String found = findOpenAiOutputText(child);
                if (hasText(found)) {
                    return found;
                }
            }
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                String found = findOpenAiOutputText(child);
                if (hasText(found)) {
                    return found;
                }
            }
        }
        return null;
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .map(this::safeString)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeReason(Exception exception) {
        String message = exception.getMessage();
        if (!hasText(message)) {
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

    public record EvaluationDraft(
            int totalScore,
            int technicalScore,
            int communicationScore,
            int experienceScore,
            int problemSolvingScore,
            List<String> strengths,
            List<String> weaknesses,
            List<String> improvementRoadmap,
            String summary,
            InterviewEvaluationMode evaluationMode,
            InterviewEvaluationProvider provider,
            String model,
            List<QuestionFeedbackDraft> perQuestionFeedback
    ) {
    }

    public record QuestionFeedbackDraft(
            UUID questionId,
            int score,
            String rationale,
            List<String> missingSignals,
            String suggestedAnswer,
            int sortOrder
    ) {
    }

    private record EvaluationContext(
            UUID sessionId,
            String targetRole,
            String seniority,
            String resumeSummary,
            List<String> focusAreas,
            List<String> questionPlan,
            String parsedResumeText,
            List<String> resumeSkills,
            List<String> roleSignals,
            List<String> projectHighlights,
            List<QuestionEvaluationInput> questions
    ) {
    }

    private record QuestionEvaluationInput(
            UUID id,
            String prompt,
            String category,
            String difficulty,
            List<String> expectedSignals,
            String answer
    ) {
    }
}
