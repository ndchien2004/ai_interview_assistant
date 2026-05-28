package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.entity.PracticeAttempt;
import com.ndchien12.aiinterview.entity.PracticeConfidence;

import java.time.Instant;
import java.util.UUID;

public record PracticeAttemptResponse(
        UUID id,
        UUID questionId,
        String answerText,
        PracticeConfidence confidence,
        Instant createdAt
) {
    public static PracticeAttemptResponse from(PracticeAttempt attempt) {
        return new PracticeAttemptResponse(
                attempt.getId(),
                attempt.getQuestion().getId(),
                attempt.getAnswerText(),
                attempt.getConfidence(),
                attempt.getCreatedAt()
        );
    }
}
