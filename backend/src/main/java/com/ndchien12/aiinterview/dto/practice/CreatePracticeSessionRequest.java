package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.entity.FlashcardStatusFilter;
import com.ndchien12.aiinterview.entity.PracticeSessionMode;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import jakarta.validation.constraints.NotBlank;

public record CreatePracticeSessionRequest(
        @NotBlank String courseSlug,
        PracticeSessionMode mode,
        String topic,
        QuestionDifficulty difficulty,
        FlashcardStatusFilter status
) {
}
