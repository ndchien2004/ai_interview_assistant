package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.practice.CreatePracticeSessionRequest;
import com.ndchien12.aiinterview.dto.practice.PracticeAttemptResponse;
import com.ndchien12.aiinterview.dto.practice.PracticeSessionResponse;
import com.ndchien12.aiinterview.dto.practice.SubmitAttemptRequest;
import com.ndchien12.aiinterview.entity.Course;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeAttempt;
import com.ndchien12.aiinterview.entity.PracticeConfidence;
import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.PracticeSessionStatus;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.entity.UserQuestionProgress;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.CourseRepository;
import com.ndchien12.aiinterview.repository.PracticeAttemptRepository;
import com.ndchien12.aiinterview.repository.PracticeQuestionRepository;
import com.ndchien12.aiinterview.repository.PracticeSessionRepository;
import com.ndchien12.aiinterview.repository.UserQuestionProgressRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PracticeService {
    private final CourseRepository courseRepository;
    private final PracticeQuestionRepository questionRepository;
    private final PracticeSessionRepository sessionRepository;
    private final PracticeAttemptRepository attemptRepository;
    private final UserQuestionProgressRepository progressRepository;
    private final UserRepository userRepository;

    public PracticeService(
            CourseRepository courseRepository,
            PracticeQuestionRepository questionRepository,
            PracticeSessionRepository sessionRepository,
            PracticeAttemptRepository attemptRepository,
            UserQuestionProgressRepository progressRepository,
            UserRepository userRepository
    ) {
        this.courseRepository = courseRepository;
        this.questionRepository = questionRepository;
        this.sessionRepository = sessionRepository;
        this.attemptRepository = attemptRepository;
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PracticeSessionResponse createSession(CreatePracticeSessionRequest request, String email) {
        User user = findUser(email);
        Course course = findActiveCourse(request.courseSlug());

        PracticeSession session = new PracticeSession();
        session.setUser(user);
        session.setCourse(course);
        session.setMode(resolveMode(request.mode()));
        session.setTopicFilter(normalizeTopic(request.topic()));
        session.setDifficultyFilter(request.difficulty());
        session.setStatusFilter(request.status() == null ? FlashcardStatusFilter.ALL : request.status());
        PracticeSession saved = sessionRepository.save(session);

        return toResponse(saved, selectNextQuestion(user, saved, List.of()));
    }

    @Transactional(readOnly = true)
    public PracticeSessionResponse getSession(UUID sessionId, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        List<PracticeAttempt> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session);
        PracticeQuestion next = session.getStatus() == PracticeSessionStatus.COMPLETED
                ? null
                : selectNextQuestion(user, session, attempts);

        return toResponse(session, next);
    }

    @Transactional
    public PracticeSessionResponse submitAttempt(UUID sessionId, SubmitAttemptRequest request, String email) {
        User user = findUser(email);
        PracticeSession session = findOwnedSession(sessionId, user);
        PracticeQuestion question = questionRepository.findById(request.questionId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found"));

        if (!question.getCourse().getId().equals(session.getCourse().getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Question does not belong to this session course");
        }

        PracticeAttempt attempt = new PracticeAttempt();
        attempt.setSession(session);
        attempt.setUser(user);
        attempt.setQuestion(question);
        attempt.setAnswerText(request.answerText());
        attempt.setConfidence(request.confidence());
        attemptRepository.save(attempt);
        updateProgress(user, question, request.confidence());

        List<PracticeAttempt> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session);
        PracticeQuestion next = selectNextQuestion(user, session, attempts);

        if (next == null) {
            session.setStatus(PracticeSessionStatus.COMPLETED);
            session.setCompletedAt(Instant.now());
            sessionRepository.save(session);
        }

        return toResponse(session, next);
    }

    private PracticeSessionResponse toResponse(PracticeSession session, PracticeQuestion nextQuestion) {
        List<PracticeAttemptResponse> attempts = attemptRepository.findBySessionOrderByCreatedAtAsc(session).stream()
                .map(PracticeAttemptResponse::from)
                .toList();
        return PracticeSessionResponse.from(
                session,
                nextQuestion == null ? null : QuestionResponse.from(nextQuestion),
                attempts
        );
    }

    private PracticeQuestion selectNextQuestion(
            User user,
            PracticeSession session,
            List<PracticeAttempt> sessionAttempts
    ) {
        if (session.getMode() == PracticeSessionMode.FLASHCARD) {
            return selectNextFlashcardQuestion(user, session, sessionAttempts);
        }

        return selectNextInterviewQuestion(user, session.getCourse(), sessionAttempts);
    }

    private PracticeQuestion selectNextInterviewQuestion(User user, Course course, List<PracticeAttempt> sessionAttempts) {
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course);
        Set<UUID> attemptedInSession = sessionAttempts.stream()
                .map(attempt -> attempt.getQuestion().getId())
                .collect(Collectors.toSet());
        List<UserQuestionProgress> progress = progressRepository.findByUserAndQuestionCourseSlug(user, course.getSlug());
        Set<UUID> seen = progress.stream()
                .map(item -> item.getQuestion().getId())
                .collect(Collectors.toSet());

        return questions.stream()
                .filter(question -> !attemptedInSession.contains(question.getId()))
                .filter(question -> !seen.contains(question.getId()))
                .findFirst()
                .orElseGet(() -> progress.stream()
                        .filter(item -> !attemptedInSession.contains(item.getQuestion().getId()))
                        .filter(item -> !item.isMastered() || !item.getNextReviewAt().isAfter(Instant.now()))
                        .sorted(Comparator
                                .comparing(UserQuestionProgress::isMastered)
                                .thenComparing(UserQuestionProgress::getNextReviewAt))
                        .map(UserQuestionProgress::getQuestion)
                        .findFirst()
                        .orElse(null));
    }

    private PracticeQuestion selectNextFlashcardQuestion(
            User user,
            PracticeSession session,
            List<PracticeAttempt> sessionAttempts
    ) {
        Course course = session.getCourse();
        List<UserQuestionProgress> progress = progressRepository.findByUserAndQuestionCourseSlug(user, course.getSlug());
        Map<UUID, UserQuestionProgress> progressByQuestionId = progress.stream()
                .collect(Collectors.toMap(item -> item.getQuestion().getId(), item -> item));
        List<PracticeQuestion> questions = questionRepository.findByCourseAndActiveTrueOrderBySortOrderAsc(course).stream()
                .filter(question -> matchesSessionFilters(question, session, progressByQuestionId.get(question.getId())))
                .toList();
        Set<UUID> attemptedInSession = sessionAttempts.stream()
                .map(attempt -> attempt.getQuestion().getId())
                .collect(Collectors.toSet());
        Set<UUID> mastered = progress.stream()
                .filter(UserQuestionProgress::isMastered)
                .map(item -> item.getQuestion().getId())
                .collect(Collectors.toSet());
        Set<UUID> seen = progress.stream()
                .map(item -> item.getQuestion().getId())
                .collect(Collectors.toSet());

        if (session.getStatusFilter() == FlashcardStatusFilter.MASTERED) {
            return questions.stream()
                    .filter(question -> !attemptedInSession.contains(question.getId()))
                    .findFirst()
                    .orElse(null);
        }

        return questions.stream()
                .filter(question -> !attemptedInSession.contains(question.getId()))
                .filter(question -> !seen.contains(question.getId()))
                .findFirst()
                .orElseGet(() -> progress.stream()
                        .filter(item -> !attemptedInSession.contains(item.getQuestion().getId()))
                        .filter(item -> !item.isMastered())
                        .sorted(Comparator
                                .comparing(UserQuestionProgress::getNextReviewAt)
                                .thenComparing(item -> item.getQuestion().getSortOrder()))
                        .map(UserQuestionProgress::getQuestion)
                        .findFirst()
                        .orElseGet(() -> questions.stream()
                                .filter(question -> !mastered.contains(question.getId()))
                                .findFirst()
                                .orElse(null)));
    }

    private boolean matchesSessionFilters(
            PracticeQuestion question,
            PracticeSession session,
            UserQuestionProgress progress
    ) {
        if (session == null) {
            return true;
        }
        if (session.getTopicFilter() != null && !session.getTopicFilter().equals(question.getTopic())) {
            return false;
        }
        if (session.getDifficultyFilter() != null && session.getDifficultyFilter() != question.getDifficulty()) {
            return false;
        }

        FlashcardStatusFilter status = session.getStatusFilter() == null
                ? FlashcardStatusFilter.ALL
                : session.getStatusFilter();
        return switch (status) {
            case ALL -> true;
            case UNSEEN -> progress == null;
            case LEARNING -> progress != null && !progress.isMastered();
            case MASTERED -> progress != null && progress.isMastered();
        };
    }

    private void updateProgress(User user, PracticeQuestion question, PracticeConfidence confidence) {
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
        progress.setMastered(confidence == PracticeConfidence.MASTERED);
        progress.setLastAttemptAt(now);
        progress.setNextReviewAt(nextReviewAt(now, confidence));
        progressRepository.save(progress);
    }

    private Instant nextReviewAt(Instant now, PracticeConfidence confidence) {
        return switch (confidence) {
            case AGAIN -> now.plus(10, ChronoUnit.MINUTES);
            case HARD -> now.plus(1, ChronoUnit.DAYS);
            case GOOD -> now.plus(3, ChronoUnit.DAYS);
            case MASTERED -> now.plus(14, ChronoUnit.DAYS);
        };
    }

    private PracticeSessionMode resolveMode(PracticeSessionMode mode) {
        return mode == null ? PracticeSessionMode.INTERVIEW : mode;
    }

    private String normalizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return null;
        }
        return topic.trim();
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
