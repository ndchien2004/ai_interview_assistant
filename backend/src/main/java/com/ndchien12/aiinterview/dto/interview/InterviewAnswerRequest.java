package com.ndchien12.aiinterview.dto.interview;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record InterviewAnswerRequest(
        @NotNull(message = "Question ID is required")
        UUID questionId,

        String response
) {
}
