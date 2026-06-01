package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewEvaluation;
import com.ndchien12.aiinterview.entity.InterviewEvaluationMode;
import com.ndchien12.aiinterview.entity.InterviewEvaluationProvider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record InterviewEvaluationResponse(
        UUID id,
        UUID sessionId,
        int totalScore,
        Map<String, Integer> categoryScores,
        List<String> strengths,
        List<String> weaknesses,
        List<String> improvementRoadmap,
        String summary,
        String evaluationMode,
        String provider,
        String model,
        List<InterviewQuestionFeedbackResponse> perQuestionFeedback,
        List<InterviewTranscriptMessageResponse> transcript,
        List<SkillScoreResponse> skillScores,
        String interviewDomain,
        Instant createdAt
) {
    public static InterviewEvaluationResponse from(
            InterviewEvaluation evaluation,
            List<InterviewTranscriptMessageResponse> transcript
    ) {
        List<SkillScoreResponse> skillScores = evaluation.getSession().getEvaluationSkills().stream()
                .map(skill -> new SkillScoreResponse(
                        skill,
                        evaluation.getTotalScore(),
                        "Score generated from the saved interview answers and transcript context."
                ))
                .toList();
        return new InterviewEvaluationResponse(
                evaluation.getId(),
                evaluation.getSession().getId(),
                evaluation.getTotalScore(),
                Map.of(
                        "technical", evaluation.getTechnicalScore(),
                        "communication", evaluation.getCommunicationScore(),
                        "experience", evaluation.getExperienceScore(),
                        "problemSolving", evaluation.getProblemSolvingScore()
                ),
                new ArrayList<>(evaluation.getStrengths()),
                new ArrayList<>(evaluation.getWeaknesses()),
                new ArrayList<>(evaluation.getImprovementRoadmap()),
                evaluation.getSummary(),
                (evaluation.getEvaluationMode() == null ? InterviewEvaluationMode.FALLBACK : evaluation.getEvaluationMode()).name(),
                (evaluation.getProvider() == null ? InterviewEvaluationProvider.LOCAL : evaluation.getProvider()).name(),
                evaluation.getModel() == null || evaluation.getModel().isBlank() ? "local" : evaluation.getModel(),
                evaluation.getQuestionFeedback().stream()
                        .sorted(Comparator.comparingInt(com.ndchien12.aiinterview.entity.InterviewQuestionFeedback::getSortOrder))
                        .map(InterviewQuestionFeedbackResponse::from)
                        .toList(),
                transcript,
                skillScores,
                evaluation.getSession().getDomain(),
                evaluation.getCreatedAt()
        );
    }
}
