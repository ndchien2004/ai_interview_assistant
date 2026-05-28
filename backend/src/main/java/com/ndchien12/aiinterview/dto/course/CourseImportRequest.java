package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.ImportDelimiterMode;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CourseImportRequest(
        @NotBlank String topic,
        @NotNull QuestionDifficulty difficulty,
        @NotBlank String content,
        ImportDelimiterMode delimiterMode
) {
}
