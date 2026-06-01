package com.ndchien12.aiinterview.dto.interview;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateInterviewRequest(
        @NotNull(message = "Resume is required")
        UUID resumeId,

        @NotBlank(message = "Target role is required")
        @Size(max = 160, message = "Target role must be 160 characters or fewer")
        String targetRole,

        @NotBlank(message = "Seniority is required")
        String seniority,

        @Min(value = 3, message = "Question count must be at least 3")
        @Max(value = 8, message = "Question count must be at most 8")
        int questionCount,

        List<String> focusAreas,

        String mode,

        @Size(max = 160, message = "Domain must be 160 characters or fewer")
        String domain,

        List<String> evaluationSkills
) {
}
