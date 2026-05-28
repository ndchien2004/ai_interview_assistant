package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.Course;

import java.util.List;
import java.util.UUID;

public record CourseDetailResponse(
        UUID id,
        String slug,
        String title,
        String description,
        boolean active,
        long questionCount,
        List<SectionResponse> sections
) {
    public static CourseDetailResponse from(Course course, long questionCount, List<SectionResponse> sections) {
        return new CourseDetailResponse(
                course.getId(),
                course.getSlug(),
                course.getTitle(),
                course.getDescription(),
                course.isActive(),
                questionCount,
                sections
        );
    }
}
