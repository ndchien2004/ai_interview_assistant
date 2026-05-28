package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record QuestionRequest(
        @NotNull UUID courseId,
        @NotNull UUID sectionId,
        @NotBlank String question,
        @NotBlank String shortAnswer,
        @NotBlank String detailedAnswer,
        List<String> keyPoints,
        List<String> commonMistakes,
        @NotNull QuestionDifficulty difficulty,
        @NotBlank String topic,
        List<String> tags,
        String codeSnippet,
        boolean active,
        int sortOrder
) {
}
