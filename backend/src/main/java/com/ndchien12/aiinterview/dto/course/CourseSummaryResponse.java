package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.Course;

import java.util.UUID;

public record CourseSummaryResponse(
        UUID id,
        String slug,
        String title,
        String description,
        boolean active,
        long questionCount
) {
    public static CourseSummaryResponse from(Course course, long questionCount) {
        return new CourseSummaryResponse(
                course.getId(),
                course.getSlug(),
                course.getTitle(),
                course.getDescription(),
                course.isActive(),
                questionCount
        );
    }
}
