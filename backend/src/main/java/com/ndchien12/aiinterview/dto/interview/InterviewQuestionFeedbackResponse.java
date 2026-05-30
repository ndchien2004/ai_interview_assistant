package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewQuestionFeedback;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record InterviewQuestionFeedbackResponse(
        UUID questionId,
        String questionPrompt,
        String answerText,
        int score,
        String rationale,
        List<String> missingSignals,
        String suggestedAnswer
) {
    public static InterviewQuestionFeedbackResponse from(InterviewQuestionFeedback feedback) {
        return new InterviewQuestionFeedbackResponse(
                feedback.getQuestionId(),
                feedback.getQuestionPrompt(),
                feedback.getAnswerText(),
                feedback.getScore(),
                feedback.getRationale(),
                new ArrayList<>(feedback.getMissingSignals()),
                feedback.getSuggestedAnswer()
        );
    }
}
