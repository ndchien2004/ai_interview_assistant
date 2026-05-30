package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewAnswer;

import java.util.UUID;

public record InterviewAnswerResponse(
        UUID questionId,
        String response
) {
    public static InterviewAnswerResponse from(InterviewAnswer answer) {
        return new InterviewAnswerResponse(
                answer.getQuestion().getId(),
                answer.getResponse()
        );
    }
}
