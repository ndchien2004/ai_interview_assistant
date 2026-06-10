package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeSessionFeedbackMode;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreatePracticeSessionRequest(
        @NotBlank String courseSlug,
        PracticeSessionMode mode,
        List<String> deckSlugs,
        String deckSlug,
        List<String> topics,
        String topic,
        List<QuestionDifficulty> difficulties,
        QuestionDifficulty difficulty,
        FlashcardStatusFilter status,
        String query,
        Integer questionLimit,
        Integer timeLimitMinutes,
        Boolean shuffle,
        PracticeSessionFeedbackMode feedbackMode
) {
}
