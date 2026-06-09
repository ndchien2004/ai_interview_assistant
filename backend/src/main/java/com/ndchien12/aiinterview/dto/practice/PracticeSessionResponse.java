package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.dto.course.QuestionResponse;
import com.ndchien12.aiinterview.dto.course.QuestionProgressResponse;
import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeSession;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.PracticeSessionStatus;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PracticeSessionResponse(
        UUID id,
        String courseSlug,
        PracticeSessionMode mode,
        String deckSlug,
        String topic,
        QuestionDifficulty difficulty,
        FlashcardStatusFilter statusFilter,
        PracticeSessionStatus status,
        Instant createdAt,
        Instant completedAt,
        QuestionResponse nextQuestion,
        List<PracticeAttemptResponse> attempts,
        QuestionProgressResponse lastProgress
) {
    public static PracticeSessionResponse from(
            PracticeSession session,
            QuestionResponse nextQuestion,
            List<PracticeAttemptResponse> attempts
    ) {
        return from(session, nextQuestion, attempts, null);
    }

    public static PracticeSessionResponse from(
            PracticeSession session,
            QuestionResponse nextQuestion,
            List<PracticeAttemptResponse> attempts,
            QuestionProgressResponse lastProgress
    ) {
        return new PracticeSessionResponse(
                session.getId(),
                session.getCourse().getSlug(),
                session.getMode(),
                session.getDeckFilter(),
                session.getTopicFilter(),
                session.getDifficultyFilter(),
                session.getStatusFilter(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getCompletedAt(),
                nextQuestion,
                attempts,
                lastProgress
        );
    }
}
