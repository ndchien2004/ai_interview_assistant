package com.ndchien12.aiinterview.dto.course;

import java.time.Instant;
import java.util.List;

public record CourseProgressResponse(
        String courseSlug,
        long totalQuestions,
        long attemptedQuestions,
        long masteredQuestions,
        long correctAnswers,
        long incorrectAnswers,
        long dueQuestions,
        long learningQuestions,
        int streakDays,
        Instant lastStudyAt,
        int accuracyPercentage,
        int masteryPercentage,
        double averageConfidence,
        List<TopicProgressResponse> topics
) {
}
