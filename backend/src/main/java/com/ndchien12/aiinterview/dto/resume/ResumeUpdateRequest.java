package com.ndchien12.aiinterview.dto.resume;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ResumeUpdateRequest(
        @NotBlank String fileName,
        @NotBlank String parsedText,
        String summary,
        List<String> skills,
        List<String> roleSignals,
        List<String> senioritySignals,
        List<String> projectHighlights,
        List<String> warnings
) {
}
