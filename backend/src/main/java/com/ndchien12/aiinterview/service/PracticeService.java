package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.practice.CreatePracticeSessionRequest;
import com.ndchien12.aiinterview.dto.practice.PracticeAttemptResponse;
import com.ndchien12.aiinterview.dto.practice.PracticeSessionResponse;
import com.ndchien12.aiinterview.dto.practice.SubmitAttemptRequest;
import com.ndchien12.aiinterview.dto.practice.SubmitMatchRequest;
import com.ndchien12.aiinterview.dto.practice.SubmitTestAnswerRequest;
import com.ndchien12.aiinterview.dto.practice.SubmitTestRequest;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeAttempt;
import com.ndchien12.aiinterview.entity.PracticeConfidence;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.PracticeSessionFeedbackMode;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.PracticeSessionQuestion;
import com.ndchien12.aiinterview.entity.PracticeSessionStatus;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.entity.UserQuestionProgress;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.PracticeAttemptRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import com.ndchien12.aiinterview.repository.PracticeSessionQuestionRepository;
import com.ndchien12.aiinterview.repository.PracticeSessionRepository;
import com.ndchien12.aiinterview.repository.UserQuestionProgressRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PracticeService {
    private static final int DEFAULT_LEARN_LIMIT = 20;
    private static final int DEFAULT_MATCH_LIMIT = 12;
    private static final int MAX_SESSION_QUESTIONS = 100;

    private final CourseRepository courseRepository;
    private final PracticeQuestionRepository questionRepository;
    private final PracticeSessionRepository sessionRepository;
    private final PracticeSessionQuestionRepository sessionQuestionRepository;
    private final PracticeAttemptRepository attemptRepository;
    private final UserQuestionProgressRepository progressRepository;
    private final UserRepository userRepository;

    public PracticeService(
            CourseRepository courseRepository,
            PracticeQuestionRepository questionRepository,
            PracticeSessionRepository sessionRepository,
            PracticeSessionQuestionRepository sessionQuestionRepository,
            PracticeAttemptRepository attemptRepository,
            UserQuestionProgressRepository progressRepository,
            UserRepository userRepository
    ) {
        this.courseRepository = courseRepository;
        this.questionRepository = questionRepository;
        this.sessionRepository = sessionRepository;
        this.sessionQuestionRepository = sessionQuestionRepository;
        this.attemptRepository = attemptRepository;
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PracticeSessionResponse createSession(CreatePracticeSessionRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(request.courseSlug());
        PracticeSessionMode mode = resolveMode(request.mode());
        List<String> deckSlugs = normalizeSlugs(request.deckSlugs(), request.deckSlug());
        List<String> topics = normalizeTopics(request.topics(), request.topic());
        List<QuestionDifficulty> difficulties = normalizeDifficulties(request.difficulties(), request.difficulty());
        int questionLimit = resolveQuestionLimit(mode, request.questionLimit());

        PracticeSession session = new PracticeSession();
        session.setUser(user);
        session.setCourse(course);
        session.setMode(mode);
        session.setDeckFilter(toCsv(deckSlugs));
        session.setTopicFilter(toCsv(topics));
        session.setDifficultyFilter(difficulties.size() == 1 ? difficulties.getFirst() : null);
        session.setDifficultyFilters(toCsv(difficulties.stream().map(Enum::name).toList()));
        session.setStatusFilter(request.status() == null ? FlashcardStatusFilter.ALL : request.status());
        session.setQueryFilter(normalizeQuery(request.query()));
        session.setQuestionLimit(questionLimit);
        session.setTimeLimitSeconds(resolveTimeLimitSeconds(request.timeLimitMinutes()));
        session.setShuffle(request.shuffle() == null || request.shuffle());
        session.setFeedbackMode(request.feedbackMode() == null
                ? defaultFeedbackMode(mode)
                : request.feedbackMode());
        if (session.getTimeLimitSeconds() != null) {
            session.setExpiresAt(Instant.now().plus(session.getTimeLimitSeconds(), ChronoUnit.SECONDS));
        }

        PracticeSession saved = sessionRepository.save(session);
        List<PracticeQuestion> questions = selectSessionQuestions(user, saved, questionLimit);
        saveSessionQuestions(saved, questions);
        PracticeQuestion next = selectNextQuestion(saved, List.of());
        completeSessionIfNeeded(saved, next);

        return toResponse(saved, next);
    }

    @Transactional(readOnly = true)
    public PracticeSessionResponse getSession(UUID sessionId, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        List<PracticeAttempt> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session);
        PracticeQuestion next = session.getStatus() == PracticeSessionStatus.COMPLETED
                ? null
                : selectNextQuestion(session, attempts);

        return toResponse(session, next);
    }

    @Transactional
    public PracticeSessionResponse submitAttempt(UUID sessionId, SubmitAttemptRequest request, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        if (session.getMode() == PracticeSessionMode.TEST && session.getFeedbackMode() == PracticeSessionFeedbackMode.END_ONLY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Use final test submission for this session");
        }
        PracticeQuestion question = findSessionQuestion(session, request.questionId());

        Boolean correct = null;
        PracticeConfidence confidence = request.confidence();
        if (request.selectedOptionIndex() != null) {
            int selected = request.selectedOptionIndex();
            if (selected < 0 || selected > 3) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected answer must be between 0 and 3");
            }
            correct = selected == question.getCorrectOptionIndex();
            confidence = confidenceFromChoice(user, question, correct);
        }
        if (confidence == null) {
            confidence = PracticeConfidence.AGAIN;
        }

        PracticeAttempt attempt = new PracticeAttempt();
        attempt.setSession(session);
        attempt.setUser(user);
        attempt.setQuestion(question);
        attempt.setAnswerText(request.answerText());
        attempt.setSelectedOptionIndex(request.selectedOptionIndex());
        attempt.setCorrect(correct);
        attempt.setTimeSpentSeconds(request.timeSpentSeconds());
        attempt.setConfidence(confidence);
        attemptRepository.save(attempt);
        updateProgress(user, question, confidence, correct);
        UserQuestionProgress updatedProgress = progressRepository.findByUserAndQuestion(user, question)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Progress was not saved"));

        List<PracticeAttempt> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session);
        PracticeQuestion next = selectNextQuestion(session, attempts);
        completeSessionIfNeeded(session, next);

        return toResponse(session, next, QuestionProgressResponse.from(updatedProgress, Instant.now()));
    }

    @Transactional
    public PracticeSessionResponse submitTest(UUID sessionId, SubmitTestRequest request, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        if (session.getMode() != PracticeSessionMode.TEST) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Session is not a test mode session");
        }
        if (session.getStatus() == PracticeSessionStatus.COMPLETED) {
            return toResponse(session, null);
        }

        Map<UUID, PracticeQuestion> sessionQuestions = sessionQuestionRepository.findBySessionOrderByPositionAsc(session).stream()
                .map(PracticeSessionQuestion::getQuestion)
                .collect(Collectors.toMap(PracticeQuestion::getId, Function.identity()));
        Set<UUID> alreadyAttempted = attemptRepository.findBySessionOrderByCreatedAtAsc(session).stream()
                .map(attempt -> attempt.getQuestion().getId())
                .collect(Collectors.toSet());

        for (SubmitTestAnswerRequest answer : request.answers()) {
            PracticeQuestion question = sessionQuestions.get(answer.questionId());
            if (question == null || alreadyAttempted.contains(question.getId()) || answer.selectedOptionIndex() == null) {
                continue;
            }
            int selected = answer.selectedOptionIndex();
            if (selected < 0 || selected > 3) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Selected answer must be between 0 and 3");
            }
            boolean correct = selected == question.getCorrectOptionIndex();
            PracticeConfidence confidence = confidenceFromChoice(user, question, correct);
            PracticeAttempt attempt = new PracticeAttempt();
            attempt.setSession(session);
            attempt.setUser(user);
            attempt.setQuestion(question);
            attempt.setSelectedOptionIndex(selected);
            attempt.setCorrect(correct);
            attempt.setTimeSpentSeconds(answer.timeSpentSeconds() == null ? request.timeSpentSeconds() : answer.timeSpentSeconds());
            attempt.setConfidence(confidence);
            attemptRepository.save(attempt);
            updateProgress(user, question, confidence, correct);
            alreadyAttempted.add(question.getId());
        }

        session.setStatus(PracticeSessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);
        return toResponse(session, null);
    }

    @Transactional
    public PracticeSessionResponse submitMatch(UUID sessionId, SubmitMatchRequest request, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        if (session.getMode() != PracticeSessionMode.MATCH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Session is not a match mode session");
        }

        Map<UUID, PracticeQuestion> sessionQuestions = sessionQuestionRepository.findBySessionOrderByPositionAsc(session).stream()
                .map(PracticeSessionQuestion::getQuestion)
                .collect(Collectors.toMap(PracticeQuestion::getId, Function.identity()));

        Instant now = Instant.now();
        for (UUID questionId : request.questionIds()) {
            PracticeQuestion question = sessionQuestions.get(questionId);
            if (question == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Question does not belong to this match session");
            }

            PracticeAttempt attempt = new PracticeAttempt();
            attempt.setSession(session);
            attempt.setUser(user);
            attempt.setQuestion(question);
            attempt.setCorrect(true);
            attempt.setTimeSpentSeconds(request.timeSpentSeconds());
            attempt.setConfidence(PracticeConfidence.GOOD);
            attemptRepository.save(attempt);
            updateMatchProgress(user, question, now);
        }

        session.setStatus(PracticeSessionStatus.COMPLETED);
        session.setCompletedAt(now);
        sessionRepository.save(session);

        return toResponse(session, null);
    }

    private PracticeSessionResponse toResponse(PracticeSession session, PracticeQuestion nextQuestion) {
        return toResponse(session, nextQuestion, null);
    }

    private PracticeSessionResponse toResponse(
            PracticeSession session,
            PracticeQuestion nextQuestion,
            QuestionProgressResponse lastProgress
    ) {
        List<QuestionResponse> questions = sessionQuestionRepository.findBySessionOrderByPositionAsc(session).stream()
                .map(PracticeSessionQuestion::getQuestion)
                .map(QuestionResponse::from)
                .toList();
        List<PracticeAttemptResponse> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session).stream()
                .map(PracticeAttemptResponse::from)
                .toList();
        return PracticeSessionResponse.from(
                session,
                nextQuestion == null ? null : QuestionResponse.from(nextQuestion),
                questions,
                attempts,
                lastProgress
        );
    }

    private List<PracticeQuestion> selectSessionQuestions(User user, PracticeSession session, int questionLimit) {
        Map<UUID, UserQuestionProgress> progressByQuestionId = progressRepository
                .findByUserAndQuestionCourseSlug(user, session.getCourse().getSlug())
                .stream()
                .collect(Collectors.toMap(item -> item.getQuestion().getId(), item -> item));
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(session.getCourse()).stream()
                .filter(question -> matchesSessionFilters(question, session, progressByQuestionId.get(question.getId())))
                .toList();

        Comparator<PracticeQuestion> comparator = session.getMode() == PracticeSessionMode.LEARN
                || session.getMode() == PracticeSessionMode.FLASHCARD
                || session.getMode() == PracticeSessionMode.REVIEW_DUE
                ? learningComparator(progressByQuestionId)
                : Comparator.comparing(PracticeQuestion::getSortOrder);

        List<PracticeQuestion> ordered = questions.stream()
                .sorted(comparator)
                .collect(Collectors.toCollection(ArrayList::new));
        if (session.isShuffle()) {
            Collections.shuffle(ordered);
        }

        return ordered.stream()
                .limit(questionLimit)
                .toList();
    }

    private Comparator<PracticeQuestion> learningComparator(Map<UUID, UserQuestionProgress> progressByQuestionId) {
        Instant now = Instant.now();
        return Comparator
                .comparingInt((PracticeQuestion question) -> learningPriority(progressByQuestionId.get(question.getId()), now))
                .thenComparing(PracticeQuestion::getSortOrder);
    }

    private int learningPriority(UserQuestionProgress progress, Instant now) {
        if (progress != null && !progress.getNextReviewAt().isAfter(now)) {
            return 0;
        }
        if (progress == null) {
            return 1;
        }
        if (!progress.isMastered()) {
            return 2;
        }
        return 3;
    }

    private void saveSessionQuestions(PracticeSession session, List<PracticeQuestion> questions) {
        for (int index = 0; index < questions.size(); index++) {
            PracticeSessionQuestion sessionQuestion = new PracticeSessionQuestion();
            sessionQuestion.setSession(session);
            sessionQuestion.setQuestion(questions.get(index));
            sessionQuestion.setPosition(index);
            sessionQuestionRepository.save(sessionQuestion);
        }
    }

    private PracticeQuestion selectNextQuestion(PracticeSession session, List<PracticeAttempt> sessionAttempts) {
        Set<UUID> attemptedInSession = sessionAttempts.stream()
                .map(attempt -> attempt.getQuestion().getId())
                .collect(Collectors.toSet());
        return sessionQuestionRepository.findBySessionOrderByPositionAsc(session).stream()
                .map(PracticeSessionQuestion::getQuestion)
                .filter(question -> !attemptedInSession.contains(question.getId()))
                .findFirst()
                .orElse(null);
    }

    private PracticeQuestion findSessionQuestion(PracticeSession session, UUID questionId) {
        return sessionQuestionRepository.findBySessionOrderByPositionAsc(session).stream()
                .map(PracticeSessionQuestion::getQuestion)
                .filter(question -> question.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Question does not belong to this session"));
    }

    private boolean matchesSessionFilters(
            PracticeQuestion question,
            PracticeSession session,
            UserQuestionProgress progress
    ) {
        if (!containsCsv(session.getTopicFilter(), question.getTopic())) {
            return false;
        }
        if (!containsCsv(session.getDeckFilter(), question.getSection().getSlug())) {
            return false;
        }
        if (!containsCsv(session.getDifficultyFilters(), question.getDifficulty().name())) {
            return false;
        }
        if (session.getMode() == PracticeSessionMode.REVIEW_DUE && (progress == null || progress.getNextReviewAt().isAfter(Instant.now()))) {
            return false;
        }
        String query = session.getQueryFilter();
        if (query != null) {
            String haystack = (question.getQuestion() + " " + question.getShortAnswer() + " " + question.getTopic() + " "
                    + String.join(" ", question.getTags())).toLowerCase(Locale.ROOT);
            if (!haystack.contains(query.toLowerCase(Locale.ROOT))) {
                return false;
            }
        }

        FlashcardStatusFilter status = session.getStatusFilter() == null
                ? FlashcardStatusFilter.ALL
                : session.getStatusFilter();
        return switch (status) {
            case ALL -> true;
            case UNSEEN -> !hasStarted(progress);
            case LEARNING -> isLearning(progress);
            case MASTERED -> isMastered(progress);
        };
    }

    private PracticeConfidence confidenceFromChoice(User user, PracticeQuestion question, boolean correct) {
        if (!correct) {
            return PracticeConfidence.AGAIN;
        }
        int previousStreak = progressRepository.findByUserAndQuestion(user, question)
                .map(UserQuestionProgress::getCorrectStreak)
                .orElse(0);
        return previousStreak >= 2 ? PracticeConfidence.MASTERED : PracticeConfidence.GOOD;
    }

    private void updateProgress(User user, PracticeQuestion question, PracticeConfidence confidence, Boolean correct) {
        Instant now = Instant.now();
        UserQuestionProgress progress = progressRepository.findByUserAndQuestion(user, question)
                .orElseGet(() -> {
                    UserQuestionProgress created = new UserQuestionProgress();
                    created.setUser(user);
                    created.setQuestion(question);
                    created.setAttemptCount(0);
                    return created;
                });

        progress.setConfidence(confidence);
        progress.setAttemptCount(progress.getAttemptCount() + 1);
        if (correct != null) {
            if (correct) {
                progress.setCorrectCount(progress.getCorrectCount() + 1);
                progress.setCorrectStreak(progress.getCorrectStreak() + 1);
            } else {
                progress.setIncorrectCount(progress.getIncorrectCount() + 1);
                progress.setCorrectStreak(0);
            }
        } else if (confidence == PracticeConfidence.GOOD || confidence == PracticeConfidence.MASTERED) {
            progress.setCorrectCount(progress.getCorrectCount() + 1);
            progress.setCorrectStreak(progress.getCorrectStreak() + 1);
        } else {
            progress.setIncorrectCount(progress.getIncorrectCount() + 1);
            progress.setCorrectStreak(0);
        }
        progress.setMastered(confidence == PracticeConfidence.MASTERED || progress.getCorrectStreak() >= 3);
        progress.setLastAttemptAt(now);
        progress.setNextReviewAt(nextReviewAt(now, confidence));
        progressRepository.save(progress);
    }

    private void updateMatchProgress(User user, PracticeQuestion question, Instant now) {
        UserQuestionProgress progress = progressRepository.findByUserAndQuestion(user, question)
                .orElseGet(() -> {
                    UserQuestionProgress created = new UserQuestionProgress();
                    created.setUser(user);
                    created.setQuestion(question);
                    created.setAttemptCount(0);
                    return created;
                });
        boolean alreadyMastered = isMastered(progress);
        progress.setConfidence(alreadyMastered ? PracticeConfidence.MASTERED : PracticeConfidence.GOOD);
        progress.setAttemptCount(progress.getAttemptCount() + 1);
        progress.setCorrectCount(progress.getCorrectCount() + 1);
        progress.setCorrectStreak(progress.getCorrectStreak() + 1);
        progress.setMastered(alreadyMastered || progress.getCorrectStreak() >= 3);
        progress.setLastAttemptAt(now);
        progress.setNextReviewAt(nextReviewAt(now, progress.getConfidence()));
        progressRepository.save(progress);
    }

    private void completeSessionIfNeeded(PracticeSession session, PracticeQuestion next) {
        if (next != null || session.getStatus() == PracticeSessionStatus.COMPLETED) {
            return;
        }

        session.setStatus(PracticeSessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        sessionRepository.save(session);
    }

    private Instant nextReviewAt(Instant now, PracticeConfidence confidence) {
        return switch (confidence) {
            case AGAIN -> now.plus(10, ChronoUnit.MINUTES);
            case HARD -> now.plus(1, ChronoUnit.DAYS);
            case GOOD -> now.plus(1, ChronoUnit.DAYS);
            case MASTERED -> now.plus(7, ChronoUnit.DAYS);
        };
    }

    private boolean hasStarted(UserQuestionProgress progress) {
        return progress != null && progress.getAttemptCount() > 0;
    }

    private boolean isLearning(UserQuestionProgress progress) {
        return hasStarted(progress) && !isMastered(progress);
    }

    private boolean isMastered(UserQuestionProgress progress) {
        return hasStarted(progress) && (progress.isMastered() || progress.getCorrectStreak() >= 3);
    }

    private PracticeSessionMode resolveMode(PracticeSessionMode mode) {
        return mode == null ? PracticeSessionMode.FLASHCARD : mode;
    }

    private PracticeSessionFeedbackMode defaultFeedbackMode(PracticeSessionMode mode) {
        return mode == PracticeSessionMode.TEST
                ? PracticeSessionFeedbackMode.END_ONLY
                : PracticeSessionFeedbackMode.IMMEDIATE;
    }

    private int resolveQuestionLimit(PracticeSessionMode mode, Integer requested) {
        int fallback = mode == PracticeSessionMode.MATCH ? DEFAULT_MATCH_LIMIT : DEFAULT_LEARN_LIMIT;
        int value = requested == null ? fallback : requested;
        return Math.max(1, Math.min(value, MAX_SESSION_QUESTIONS));
    }

    private Integer resolveTimeLimitSeconds(Integer minutes) {
        if (minutes == null || minutes <= 0) {
            return null;
        }
        return Math.min(minutes, 24 * 60) * 60;
    }

    private List<String> normalizeSlugs(List<String> values, String fallback) {
        return normalizeStrings(values, fallback).stream()
                .map(String::toLowerCase)
                .toList();
    }

    private List<String> normalizeTopics(List<String> values, String fallback) {
        return normalizeStrings(values, fallback);
    }

    private List<String> normalizeStrings(List<String> values, String fallback) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (values != null) {
            values.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .map(String::trim)
                    .forEach(normalized::add);
        }
        if (fallback != null && !fallback.isBlank()) {
            normalized.add(fallback.trim());
        }
        return List.copyOf(normalized);
    }

    private List<QuestionDifficulty> normalizeDifficulties(List<QuestionDifficulty> values, QuestionDifficulty fallback) {
        LinkedHashSet<QuestionDifficulty> normalized = new LinkedHashSet<>();
        if (values != null) {
            values.stream()
                    .filter(value -> value != null)
                    .forEach(normalized::add);
        }
        if (fallback != null) {
            normalized.add(fallback);
        }
        return List.copyOf(normalized);
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        return query.trim();
    }

    private String toCsv(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values);
    }

    private boolean containsCsv(String csv, String value) {
        if (csv == null || csv.isBlank()) {
            return true;
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .anyMatch(item -> item.equals(value));
    }

    private PracticeSession findOwnedSession(UUID sessionId, User user) {
        PracticeSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Practice session not found"));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Practice session does not belong to current user");
        }
        return session;
    }

    private Course findActiveCourse(String slug) {
        Course course = courseRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Course not found"));
        if (!course.isActive()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Course not found");
        }
        return course;
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
