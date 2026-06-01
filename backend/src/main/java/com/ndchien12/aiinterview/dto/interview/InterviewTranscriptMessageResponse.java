package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewTranscriptMessage;

import java.time.Instant;
import java.util.UUID;

public record InterviewTranscriptMessageResponse(
        UUID id,
        String role,
        String content,
        UUID questionId,
        Instant createdAt
) {
    public static InterviewTranscriptMessageResponse from(InterviewTranscriptMessage message) {
        return new InterviewTranscriptMessageResponse(
                message.getId(),
                message.getRole(),
                message.getContent(),
                message.getQuestionId(),
                message.getCreatedAt()
        );
    }
}
