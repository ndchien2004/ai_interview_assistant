package com.ndchien12.aiinterview.dto.practice;

import com.ndchien12.aiinterview.entity.PracticeConfidence;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SubmitAttemptRequest(
        @NotNull UUID questionId,
        String answerText,
        @NotNull PracticeConfidence confidence
) {
}
