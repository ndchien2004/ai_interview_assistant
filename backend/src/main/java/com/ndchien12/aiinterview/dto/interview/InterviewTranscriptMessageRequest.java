package com.ndchien12.aiinterview.dto.interview;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record InterviewTranscriptMessageRequest(
        @NotBlank(message = "Transcript role is required")
        @Pattern(regexp = "^(system|interviewer|candidate)$", message = "Transcript role is invalid")
        String role,

        @NotBlank(message = "Transcript content is required")
        @Size(max = 6000, message = "Transcript content is too long")
        String content,

        UUID questionId,

        Instant createdAt
) {
}
