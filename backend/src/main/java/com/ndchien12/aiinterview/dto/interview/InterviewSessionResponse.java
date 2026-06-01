package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewSession;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record InterviewSessionResponse(
        UUID id,
        UUID userId,
        UUID resumeId,
        String targetRole,
        String seniority,
        int questionCount,
        String status,
        Instant createdAt,
        Instant completedAt,
        List<InterviewQuestionResponse> questions,
        List<InterviewAnswerResponse> answers,
        UUID evaluationId,
        String sourceResumeSummary,
        List<String> focusAreas,
        List<String> questionPlan,
        String generationMode,
        String mode,
        String domain,
        List<String> evaluationSkills,
        List<InterviewTranscriptMessageResponse> transcript
) {
    public static InterviewSessionResponse from(
            InterviewSession session,
            List<InterviewQuestionResponse> questions,
            List<InterviewAnswerResponse> answers,
            UUID evaluationId,
            List<InterviewTranscriptMessageResponse> transcript
    ) {
        return new InterviewSessionResponse(
                session.getId(),
                session.getUser().getId(),
                session.getResume().getId(),
                session.getTargetRole(),
                session.getSeniority(),
                session.getQuestionCount(),
                switch (session.getStatus()) {
                    case DRAFT -> "draft";
                    case IN_PROGRESS -> "in-progress";
                    case COMPLETED -> "completed";
                },
                session.getCreatedAt(),
                session.getCompletedAt(),
                questions,
                answers,
                evaluationId,
                session.getSourceResumeSummary(),
                new ArrayList<>(session.getFocusAreas()),
                new ArrayList<>(session.getQuestionPlan()),
                session.getGenerationMode(),
                session.getMode() == null ? "WRITTEN" : session.getMode().name(),
                session.getDomain(),
                new ArrayList<>(session.getEvaluationSkills()),
                transcript
        );
    }
}
