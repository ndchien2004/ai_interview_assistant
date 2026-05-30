package com.ndchien12.aiinterview.dto.interview;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SaveInterviewAnswersRequest(
        @NotNull(message = "Answers are required")
        List<@Valid InterviewAnswerRequest> answers
) {
}
