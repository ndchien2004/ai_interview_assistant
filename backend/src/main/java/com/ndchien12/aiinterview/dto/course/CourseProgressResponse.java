package com.ndchien12.aiinterview.dto.course;

import java.util.List;

public record CourseProgressResponse(
        String courseSlug,
        long totalQuestions,
        long attemptedQuestions,
        long masteredQuestions,
        int masteryPercentage,
        double averageConfidence,
        List<TopicProgressResponse> topics
) {
}
