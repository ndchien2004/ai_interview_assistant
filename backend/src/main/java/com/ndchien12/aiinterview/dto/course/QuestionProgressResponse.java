package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.PracticeConfidence;
import com.ndchien12.aiinterview.entity.UserQuestionProgress;

import java.time.Instant;
import java.util.UUID;

public record QuestionProgressResponse(
        UUID questionId,
        PracticeConfidence confidence,
        int attemptCount,
        int correctCount,
        int incorrectCount,
        int correctStreak,
        boolean mastered,
        Instant lastAttemptAt,
        Instant nextReviewAt,
        boolean due
) {
    public static QuestionProgressResponse from(UserQuestionProgress progress, Instant now) {
        return new QuestionProgressResponse(
                progress.getQuestion().getId(),
                progress.getConfidence(),
                progress.getAttemptCount(),
                progress.getCorrectCount(),
                progress.getIncorrectCount(),
                progress.getCorrectStreak(),
                progress.isMastered(),
                progress.getLastAttemptAt(),
                progress.getNextReviewAt(),
                !progress.getNextReviewAt().isAfter(now)
        );
    }
}
