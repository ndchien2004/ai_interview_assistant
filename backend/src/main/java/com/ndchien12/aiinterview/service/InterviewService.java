package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.interview.CreateInterviewRequest;
import com.ndchien12.aiinterview.dto.interview.InterviewAnswerRequest;
import com.ndchien12.aiinterview.dto.interview.InterviewAnswerResponse;
import com.ndchien12.aiinterview.dto.interview.InterviewEvaluationResponse;
import com.ndchien12.aiinterview.dto.interview.InterviewQuestionResponse;
import com.ndchien12.aiinterview.dto.interview.InterviewSessionResponse;
import com.ndchien12.aiinterview.dto.interview.SaveInterviewAnswersRequest;
import com.ndchien12.aiinterview.entity.InterviewAnswer;
import com.ndchien12.aiinterview.entity.InterviewEvaluation;
import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewQuestionCategory;
import com.ndchien12.aiinterview.entity.InterviewQuestionDifficulty;
import com.ndchien12.aiinterview.entity.InterviewQuestionFeedback;
import com.ndchien12.aiinterview.entity.InterviewSession;
import com.ndchien12.aiinterview.entity.InterviewSessionStatus;
import com.ndchien12.aiinterview.entity.Resume;
import com.ndchien12.aiinterview.entity.ResumeStatus;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.InterviewAnswerRepository;
import com.ndchien12.aiinterview.repository.InterviewEvaluationRepository;
import com.ndchien12.aiinterview.repository.InterviewQuestionRepository;
import com.ndchien12.aiinterview.repository.InterviewSessionRepository;
import com.ndchien12.aiinterview.repository.ResumeRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import com.ndchien12.aiinterview.service.InterviewEvaluationService.EvaluationDraft;
import com.ndchien12.aiinterview.service.InterviewEvaluationService.QuestionFeedbackDraft;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class InterviewService {
    private static final List<QuestionTemplate> QUESTION_BANK = List.of(
            new QuestionTemplate("frontend", InterviewQuestionCategory.TECHNICAL, "How would you design the UI architecture for a {targetRole} feature using {skill}, and what tradeoffs would you call out for a {seniority} interview?", List.of("component boundaries", "state management", "accessibility", "tradeoffs")),
            new QuestionTemplate("frontend", InterviewQuestionCategory.SYSTEM_DESIGN, "Design a responsive, authenticated dashboard for {targetRole}. How would you handle data loading, error states, and user feedback?", List.of("routing", "loading states", "error handling", "responsive design")),
            new QuestionTemplate("backend", InterviewQuestionCategory.TECHNICAL, "Walk through how you would build a secure API for a {targetRole} workflow using {skill}.", List.of("API contract", "authentication", "validation", "persistence")),
            new QuestionTemplate("backend", InterviewQuestionCategory.SYSTEM_DESIGN, "Design the backend for a resume-based interview generator. How would you model data, generation jobs, and retries?", List.of("data model", "idempotency", "failure handling", "observability")),
            new QuestionTemplate("fullstack", InterviewQuestionCategory.TECHNICAL, "Explain how you connected frontend, backend, and database concerns in {projectHighlight}. What would you improve for production?", List.of("end-to-end flow", "security", "testing", "production readiness")),
            new QuestionTemplate("fullstack", InterviewQuestionCategory.SYSTEM_DESIGN, "Design a full-stack feature for {targetRole} that uses {skill}. Cover API shape, UI states, and persistence.", List.of("API design", "UI workflow", "database model", "tradeoffs")),
            new QuestionTemplate("data", InterviewQuestionCategory.TECHNICAL, "How would you validate and process data for a {targetRole} workflow, and where would {skill} fit?", List.of("data quality", "pipeline design", "metrics", "tradeoffs")),
            new QuestionTemplate("devops", InterviewQuestionCategory.TECHNICAL, "How would you deploy and monitor {projectHighlight} for a {targetRole} team?", List.of("deployment", "monitoring", "rollback", "security")),
            new QuestionTemplate("qa", InterviewQuestionCategory.TECHNICAL, "How would you test a critical {targetRole} feature end to end, especially around {skill}?", List.of("test pyramid", "edge cases", "automation", "risk")),
            new QuestionTemplate("general", InterviewQuestionCategory.TECHNICAL, "Pick a technical decision from {projectHighlight}. Why was it the right choice, and what alternatives did you reject?", List.of("decision quality", "alternatives", "tradeoffs", "outcome")),
            new QuestionTemplate("general", InterviewQuestionCategory.EXPERIENCE, "Tell me about {projectHighlight}. What was your role, what was hard, and what measurable outcome came from it?", List.of("ownership", "specific challenge", "actions", "outcome")),
            new QuestionTemplate("general", InterviewQuestionCategory.BEHAVIORAL, "Describe a time you had to learn or debug something quickly while working toward a {targetRole} goal.", List.of("learning loop", "communication", "ownership", "result")),
            new QuestionTemplate("general", InterviewQuestionCategory.SYSTEM_DESIGN, "Design a small but production-ready system related to {targetRole}. How would you evolve it as usage grows?", List.of("requirements", "scaling path", "failure modes", "tradeoffs"))
    );

    private final InterviewSessionRepository sessionRepository;
    private final InterviewQuestionRepository questionRepository;
    private final InterviewAnswerRepository answerRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final InterviewEvaluationService evaluationService;

    public InterviewService(
            InterviewSessionRepository sessionRepository,
            InterviewQuestionRepository questionRepository,
            InterviewAnswerRepository answerRepository,
            InterviewEvaluationRepository evaluationRepository,
            ResumeRepository resumeRepository,
            UserRepository userRepository,
            InterviewEvaluationService evaluationService
    ) {
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.evaluationRepository = evaluationRepository;
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.evaluationService = evaluationService;
    }

    @Transactional(readOnly = true)
    public List<InterviewSessionResponse> listSessions(String email) {
        User user = findUser(email);
        return sessionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InterviewSessionResponse getSession(UUID id, String email) {
        return toResponse(findOwnedSession(id, findUser(email)));
    }

    @Transactional
    public InterviewSessionResponse createSession(CreateInterviewRequest request, String email) {
        User user = findUser(email);
        Resume resume = resumeRepository.findByIdAndUser(request.resumeId(), user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Resume not found"));

        validateResume(resume);

        String targetRole = request.targetRole().trim();
        String seniority = normalizeSeniority(request.seniority());
        int questionCount = request.questionCount();
        List<String> focusAreas = cleanList(request.focusAreas());
        if (focusAreas.isEmpty()) {
            focusAreas = resume.getSkills().stream().limit(3).toList();
        }

        InterviewSession session = new InterviewSession();
        session.setUser(user);
        session.setResume(resume);
        session.setTargetRole(targetRole);
        session.setSeniority(seniority);
        session.setQuestionCount(questionCount);
        session.setStatus(InterviewSessionStatus.IN_PROGRESS);
        session.setSourceResumeSummary(safeString(resume.getSummary()));
        session.setFocusAreas(new ArrayList<>(focusAreas));
        session.setQuestionPlan(questionPlan(questionCount).stream().map(this::categoryValue).toList());
        session.setGenerationMode("HYBRID");
        InterviewSession savedSession = sessionRepository.save(session);

        List<InterviewQuestion> questions = buildQuestions(savedSession, resume, focusAreas);
        questionRepository.saveAll(questions);

        return toResponse(savedSession);
    }

    @Transactional
    public InterviewSessionResponse saveAnswers(UUID sessionId, SaveInterviewAnswersRequest request, String email) {
        User user = findUser(email);
        InterviewSession session = findOwnedSession(sessionId, user);
        List<InterviewQuestion> questions = questionRepository.findBySessionOrderBySortOrderAsc(session);
        Map<UUID, InterviewQuestion> questionsById = new HashMap<>();
        questions.forEach(question -> questionsById.put(question.getId(), question));

        answerRepository.deleteBySession(session);
        List<InterviewAnswer> answers = new ArrayList<>();
        for (InterviewAnswerRequest item : request.answers()) {
            InterviewQuestion question = questionsById.get(item.questionId());
            if (question == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Answer question does not belong to this interview");
            }

            InterviewAnswer answer = new InterviewAnswer();
            answer.setSession(session);
            answer.setQuestion(question);
            answer.setResponse(safeString(item.response()));
            answers.add(answer);
        }
        answerRepository.saveAll(answers);

        return toResponse(session);
    }

    @Transactional
    public InterviewEvaluationResponse evaluate(UUID sessionId, SaveInterviewAnswersRequest request, String email) {
        saveAnswers(sessionId, request, email);
        InterviewSession session = findOwnedSession(sessionId, findUser(email));
        List<InterviewQuestion> questions = questionRepository.findBySessionOrderBySortOrderAsc(session);
        List<InterviewAnswer> answers = answerRepository.findBySessionOrderByCreatedAtAsc(session);
        InterviewEvaluation evaluation = evaluationRepository.findBySession(session)
                .orElseGet(() -> {
                    InterviewEvaluation created = new InterviewEvaluation();
                    created.setSession(session);
                    return created;
                });
        EvaluationDraft draft = evaluationService.evaluate(session, session.getResume(), questions, answers);
        applyEvaluationDraft(evaluation, draft, questions, answers);
        InterviewEvaluation savedEvaluation = evaluationRepository.save(evaluation);

        session.setStatus(InterviewSessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);

        return InterviewEvaluationResponse.from(savedEvaluation);
    }

    private void applyEvaluationDraft(
            InterviewEvaluation evaluation,
            EvaluationDraft draft,
            List<InterviewQuestion> questions,
            List<InterviewAnswer> answers
    ) {
        evaluation.setTotalScore(draft.totalScore());
        evaluation.setTechnicalScore(draft.technicalScore());
        evaluation.setCommunicationScore(draft.communicationScore());
        evaluation.setExperienceScore(draft.experienceScore());
        evaluation.setProblemSolvingScore(draft.problemSolvingScore());
        evaluation.setStrengths(nonEmpty(draft.strengths(), "Completed the interview evaluation."));
        evaluation.setWeaknesses(nonEmpty(draft.weaknesses(), "Add more specific examples and measurable outcomes."));
        evaluation.setImprovementRoadmap(nonEmpty(draft.improvementRoadmap(), "Practice concise answers with evidence, tradeoffs, and outcomes."));
        evaluation.setSummary(safeString(draft.summary()).isBlank()
                ? "Evaluation generated for this interview session."
                : draft.summary());
        evaluation.setEvaluationMode(draft.evaluationMode());
        evaluation.setProvider(draft.provider());
        evaluation.setModel(safeString(draft.model()).isBlank() ? "unknown" : draft.model());

        Map<UUID, QuestionFeedbackDraft> feedbackByQuestionId = new HashMap<>();
        if (draft.perQuestionFeedback() != null) {
            draft.perQuestionFeedback().forEach(feedback -> feedbackByQuestionId.put(feedback.questionId(), feedback));
        }
        Map<UUID, String> answersByQuestionId = new HashMap<>();
        answers.forEach(answer -> answersByQuestionId.put(answer.getQuestion().getId(), safeString(answer.getResponse())));

        List<InterviewQuestionFeedback> feedbackEntities = questions.stream()
                .sorted(Comparator.comparingInt(InterviewQuestion::getSortOrder))
                .map(question -> questionFeedback(question, answersByQuestionId.getOrDefault(question.getId(), ""), feedbackByQuestionId.get(question.getId())))
                .toList();
        evaluation.setQuestionFeedback(feedbackEntities);
    }

    private InterviewQuestionFeedback questionFeedback(
            InterviewQuestion question,
            String answer,
            QuestionFeedbackDraft draft
    ) {
        InterviewQuestionFeedback feedback = new InterviewQuestionFeedback();
        feedback.setQuestionId(question.getId());
        feedback.setQuestionPrompt(question.getPrompt());
        feedback.setAnswerText(answer);
        feedback.setScore(draft == null ? 0 : draft.score());
        feedback.setRationale(draft == null || safeString(draft.rationale()).isBlank()
                ? "No detailed feedback was returned for this question."
                : draft.rationale());
        feedback.setMissingSignals(draft == null ? new ArrayList<>(question.getExpectedSignals()) : new ArrayList<>(draft.missingSignals()));
        feedback.setSuggestedAnswer(draft == null || safeString(draft.suggestedAnswer()).isBlank()
                ? "Answer with a clear conclusion, a concrete project example, tradeoffs, and an outcome."
                : draft.suggestedAnswer());
        feedback.setSortOrder(question.getSortOrder());
        return feedback;
    }

    private List<String> nonEmpty(List<String> values, String fallback) {
        if (values == null || values.isEmpty()) {
            return List.of(fallback);
        }
        return values;
    }

    @Transactional(readOnly = true)
    public InterviewEvaluationResponse getEvaluation(UUID id, String email) {
        User user = findUser(email);
        InterviewEvaluation evaluation = evaluationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evaluation not found"));
        if (!evaluation.getSession().getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Evaluation does not belong to current user");
        }
        return InterviewEvaluationResponse.from(evaluation);
    }

    @Transactional(readOnly = true)
    public InterviewEvaluationResponse getEvaluationBySession(UUID sessionId, String email) {
        InterviewSession session = findOwnedSession(sessionId, findUser(email));
        return evaluationRepository.findBySession(session)
                .map(InterviewEvaluationResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Evaluation not found"));
    }

    private List<InterviewQuestion> buildQuestions(
            InterviewSession session,
            Resume resume,
            List<String> focusAreas
    ) {
        String roleGroup = roleGroup(session.getTargetRole(), resume);
        InterviewQuestionDifficulty difficulty = difficultyFor(session.getSeniority());
        List<InterviewQuestionCategory> plan = questionPlan(session.getQuestionCount());
        List<InterviewQuestion> questions = new ArrayList<>();

        for (int index = 0; index < plan.size(); index += 1) {
            InterviewQuestionCategory category = plan.get(index);
            QuestionTemplate template = selectTemplate(roleGroup, category);
            InterviewQuestion question = new InterviewQuestion();
            question.setSession(session);
            question.setCategory(category);
            question.setDifficulty(difficulty);
            question.setSortOrder(index + 1);
            question.setPrompt(render(template.promptTemplate(), session, resume, focusAreas, index));
            question.setExpectedSignals(expectedSignals(template, resume, focusAreas));
            questions.add(question);
        }

        return questions;
    }

    private List<InterviewQuestionCategory> questionPlan(int questionCount) {
        List<InterviewQuestionCategory> plan = new ArrayList<>(List.of(
                InterviewQuestionCategory.TECHNICAL,
                InterviewQuestionCategory.EXPERIENCE,
                InterviewQuestionCategory.BEHAVIORAL
        ));
        if (questionCount >= 4) {
            plan.add(InterviewQuestionCategory.SYSTEM_DESIGN);
        }
        if (questionCount >= 5) {
            plan.add(1, InterviewQuestionCategory.TECHNICAL);
        }
        while (plan.size() < questionCount) {
            plan.add(plan.size() % 2 == 0 ? InterviewQuestionCategory.EXPERIENCE : InterviewQuestionCategory.TECHNICAL);
        }
        return plan.subList(0, questionCount);
    }

    private QuestionTemplate selectTemplate(String roleGroup, InterviewQuestionCategory category) {
        return QUESTION_BANK.stream()
                .filter(template -> template.category() == category)
                .filter(template -> template.roleGroup().equals(roleGroup))
                .findFirst()
                .orElseGet(() -> QUESTION_BANK.stream()
                        .filter(template -> template.category() == category)
                        .filter(template -> template.roleGroup().equals("general"))
                        .findFirst()
                        .orElseThrow());
    }

    private String render(
            String template,
            InterviewSession session,
            Resume resume,
            List<String> focusAreas,
            int index
    ) {
        String skill = pick(focusAreas.isEmpty() ? resume.getSkills() : focusAreas, index, "a core skill");
        String project = pick(resume.getProjectHighlights(), index, "your most relevant resume project");
        return template
                .replace("{targetRole}", session.getTargetRole())
                .replace("{seniority}", session.getSeniority().toLowerCase(Locale.ROOT))
                .replace("{skill}", skill)
                .replace("{projectHighlight}", project);
    }

    private List<String> expectedSignals(QuestionTemplate template, Resume resume, List<String> focusAreas) {
        LinkedHashSet<String> signals = new LinkedHashSet<>(template.expectedSignals());
        focusAreas.stream().limit(2).forEach(skill -> signals.add("evidence for " + skill));
        resume.getProjectHighlights().stream().findFirst().ifPresent(project -> signals.add("specific resume example"));
        return new ArrayList<>(signals);
    }

    private String roleGroup(String targetRole, Resume resume) {
        String combined = (targetRole + " " + String.join(" ", resume.getRoleSignals()) + " " + String.join(" ", resume.getSkills()))
                .toLowerCase(Locale.ROOT);
        if (combined.contains("full")) return "fullstack";
        if (combined.contains("front") || combined.contains("react") || combined.contains("next")) return "frontend";
        if (combined.contains("back") || combined.contains("spring") || combined.contains("api")) return "backend";
        if (combined.contains("mobile") || combined.contains("android") || combined.contains("ios")) return "mobile";
        if (combined.contains("data") || combined.contains("ml") || combined.contains("analytics")) return "data";
        if (combined.contains("devops") || combined.contains("cloud") || combined.contains("docker")) return "devops";
        if (combined.contains("qa") || combined.contains("test")) return "qa";
        return "general";
    }

    private InterviewQuestionDifficulty difficultyFor(String seniority) {
        if ("Senior".equals(seniority)) return InterviewQuestionDifficulty.SENIOR;
        if ("Middle".equals(seniority)) return InterviewQuestionDifficulty.MID;
        return InterviewQuestionDifficulty.JUNIOR;
    }

    private String categoryValue(InterviewQuestionCategory category) {
        return category == InterviewQuestionCategory.SYSTEM_DESIGN
                ? "system-design"
                : category.name().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    private String normalizeSeniority(String value) {
        String normalized = safeString(value).toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "intern" -> "Intern";
            case "middle", "mid" -> "Middle";
            case "senior" -> "Senior";
            default -> "Junior";
        };
    }

    private void validateResume(Resume resume) {
        if (resume.getStatus() == ResumeStatus.FAILED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume must be fixed before creating an interview");
        }
        if (toPlainText(resume.getParsedText()).length() < 80) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume text is too short for question generation");
        }
    }

    private InterviewSessionResponse toResponse(InterviewSession session) {
        UUID evaluationId = evaluationRepository.findBySession(session)
                .map(InterviewEvaluation::getId)
                .orElse(null);
        return InterviewSessionResponse.from(
                session,
                questionRepository.findBySessionOrderBySortOrderAsc(session).stream()
                        .map(InterviewQuestionResponse::from)
                        .toList(),
                answerRepository.findBySessionOrderByCreatedAtAsc(session).stream()
                        .map(InterviewAnswerResponse::from)
                        .toList(),
                evaluationId
        );
    }

    private InterviewSession findOwnedSession(UUID sessionId, User user) {
        return sessionRepository.findByIdAndUser(sessionId, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Interview not found"));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) return new ArrayList<>();
        return values.stream()
                .map(this::safeString)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String pick(List<String> values, int index, String fallback) {
        if (values == null || values.isEmpty()) return fallback;
        return values.get(index % values.size());
    }

    private String toPlainText(String value) {
        return safeString(value)
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</(p|div|li|h[1-6])>", "\n")
                .replaceAll("<[^>]*>", "")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#039;", "'")
                .trim();
    }

    private record QuestionTemplate(
            String roleGroup,
            InterviewQuestionCategory category,
            String promptTemplate,
            List<String> expectedSignals
    ) {
    }
}
