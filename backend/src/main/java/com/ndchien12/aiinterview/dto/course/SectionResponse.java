package com.ndchien12.aiinterview.dto.course;

import com.ndchien12.aiinterview.entity.CourseSection;

import java.util.List;
import java.util.UUID;

public record SectionResponse(
        UUID id,
        String slug,
        String title,
        String description,
        int sortOrder,
        List<QuestionResponse> questions
) {
    public static SectionResponse from(CourseSection section, List<QuestionResponse> questions) {
        return new SectionResponse(
                section.getId(),
                section.getSlug(),
                section.getTitle(),
                section.getDescription(),
                section.getSortOrder(),
                questions
        );
    }
}
