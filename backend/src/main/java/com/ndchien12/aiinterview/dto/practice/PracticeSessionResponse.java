package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeSessionFeedbackMode;
import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.PracticeSessionStatus;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record PracticeSessionResponse(
        UUID id,
        String courseSlug,
        PracticeSessionMode mode,
        String deckSlug,
        List<String> deckSlugs,
        String topic,
        List<String> topics,
        QuestionDifficulty difficulty,
        List<QuestionDifficulty> difficulties,
        FlashcardStatusFilter statusFilter,
        String query,
        Integer questionLimit,
        Integer timeLimitSeconds,
        Instant expiresAt,
        boolean shuffle,
        PracticeSessionFeedbackMode feedbackMode,
        int questionCount,
        int answeredCount,
        PracticeSessionStatus status,
        Instant createdAt,
        Instant completedAt,
        QuestionResponse nextQuestion,
        List<QuestionResponse> questions,
        List<PracticeAttemptResponse> attempts,
        QuestionProgressResponse lastProgress
) {
    public static PracticeSessionResponse from(
            PracticeSession session,
            QuestionResponse nextQuestion,
            List<QuestionResponse> questions,
            List<PracticeAttemptResponse> attempts
    ) {
        return from(session, nextQuestion, questions, attempts, null);
    }

    public static PracticeSessionResponse from(
            PracticeSession session,
            QuestionResponse nextQuestion,
            List<QuestionResponse> questions,
            List<PracticeAttemptResponse> attempts,
            QuestionProgressResponse lastProgress
    ) {
        return new PracticeSessionResponse(
                session.getId(),
                session.getCourse().getSlug(),
                session.getMode(),
                session.getDeckFilter(),
                splitCsv(session.getDeckFilter()),
                session.getTopicFilter(),
                splitCsv(session.getTopicFilter()),
                session.getDifficultyFilter(),
                splitCsv(session.getDifficultyFilters()).stream().map(QuestionDifficulty::valueOf).toList(),
                session.getStatusFilter(),
                session.getQueryFilter(),
                session.getQuestionLimit(),
                session.getTimeLimitSeconds(),
                session.getExpiresAt(),
                session.isShuffle(),
                session.getFeedbackMode(),
                questions.size(),
                attempts.size(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getCompletedAt(),
                nextQuestion,
                questions,
                attempts,
                lastProgress
        );
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }
}
