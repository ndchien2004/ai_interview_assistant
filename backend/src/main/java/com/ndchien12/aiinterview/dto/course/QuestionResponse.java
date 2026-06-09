package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.PracticeQuestion;
import com.ndchien12.aiinterview.entity.QuestionDifficulty;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record QuestionResponse(
        UUID id,
        String question,
        String shortAnswer,
        String detailedAnswer,
        List<String> keyPoints,
        List<String> commonMistakes,
        List<String> options,
        int correctOptionIndex,
        String explanation,
        QuestionDifficulty difficulty,
        String topic,
        List<String> tags,
        String codeSnippet,
        int sortOrder
) {
    public static QuestionResponse from(PracticeQuestion question) {
        return new QuestionResponse(
                question.getId(),
                question.getQuestion(),
                question.getShortAnswer(),
                question.getDetailedAnswer(),
                new ArrayList<>(question.getKeyPoints()),
                new ArrayList<>(question.getCommonMistakes()),
                new ArrayList<>(question.getOptions()),
                question.getCorrectOptionIndex(),
                question.getExplanation(),
                question.getDifficulty(),
                question.getTopic(),
                new ArrayList<>(question.getTags()),
                question.getCodeSnippet(),
                question.getSortOrder()
        );
    }
}
