package com.ndchien12.aiinterview.dto.course;

import java.util.List;

public record CourseImportResponse(
        int importedCount,
        int skippedCount,
        List<CourseImportRowError> invalidRows,
        List<QuestionResponse> createdQuestions
) {
}
