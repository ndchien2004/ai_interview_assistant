package com.ndchien12.aiinterview.dto.course;

public record CourseImportRowError(
        int rowNumber,
        String raw,
        String reason
) {
}
