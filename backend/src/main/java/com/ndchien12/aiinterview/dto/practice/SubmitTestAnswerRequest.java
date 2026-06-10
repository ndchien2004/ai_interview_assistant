package com.ndchien12.aiinterview.dto.practice;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SubmitTestAnswerRequest(
        @NotNull UUID questionId,
        Integer selectedOptionIndex,
        Integer timeSpentSeconds
) {
}
