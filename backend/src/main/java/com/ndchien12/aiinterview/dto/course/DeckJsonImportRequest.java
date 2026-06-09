package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record DeckJsonImportRequest(
        String title,
        String description,
        @NotEmpty List<DeckSectionImportRequest> sections
) {
    public record DeckSectionImportRequest(
            String title,
            String slug,
            String description,
            int sortOrder,
            @NotEmpty List<DeckQuestionImportRequest> questions
    ) {
    }

    public record DeckQuestionImportRequest(
            String question,
            List<String> options,
            String correctAnswer,
            String explanation,
            QuestionDifficulty difficulty,
            List<String> tags,
            String codeSnippet
    ) {
    }
}
