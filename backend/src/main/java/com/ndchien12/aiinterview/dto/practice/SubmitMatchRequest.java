package com.ndchien12.aiinterview.dto.practice;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record SubmitMatchRequest(
        @NotEmpty List<UUID> questionIds,
        int mistakeCount,
        Integer timeSpentSeconds
) {
}
