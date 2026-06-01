package com.ndchien12.aiinterview.dto.interview;

import jakarta.validation.Valid;

import java.util.List;

public record SaveInterviewTranscriptRequest(
        List<@Valid InterviewTranscriptMessageRequest> transcript
) {
}
