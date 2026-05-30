package com.ndchien12.aiinterview.dto.interview;

import com.ndchien12.aiinterview.entity.InterviewQuestion;
import com.ndchien12.aiinterview.entity.InterviewQuestionCategory;
import com.ndchien12.aiinterview.entity.InterviewQuestionDifficulty;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public record InterviewQuestionResponse(
        UUID id,
        String prompt,
        String category,
        String difficulty,
        List<String> expectedSignals
) {
    public static InterviewQuestionResponse from(InterviewQuestion question) {
        return new InterviewQuestionResponse(
                question.getId(),
                question.getPrompt(),
                categoryValue(question.getCategory()),
                difficultyValue(question.getDifficulty()),
                new ArrayList<>(question.getExpectedSignals())
        );
    }

    private static String categoryValue(InterviewQuestionCategory category) {
        return category == InterviewQuestionCategory.SYSTEM_DESIGN
                ? "system-design"
                : category.name().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    private static String difficultyValue(InterviewQuestionDifficulty difficulty) {
        return difficulty.name().toLowerCase(Locale.ROOT);
    }
}
