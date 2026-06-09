package com.ndchien12.aiinterview.dto.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DeckQuestionUpdateRequest(
        @NotBlank String question,
        @NotNull @Size(min = 4, max = 4) List<@NotBlank String> options,
        int correctOptionIndex,
        @NotBlank String explanation
) {
}
