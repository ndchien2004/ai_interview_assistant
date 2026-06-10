package com.ndchien12.aiinterview.dto.practice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SubmitTestRequest(
        @NotNull @Valid List<SubmitTestAnswerRequest> answers,
        Integer timeSpentSeconds
) {
}
