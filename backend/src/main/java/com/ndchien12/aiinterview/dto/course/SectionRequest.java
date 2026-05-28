package com.ndchien12.aiinterview.dto.course;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SectionRequest(
        @NotBlank String slug,
        @NotBlank @Size(max = 180) String title,
        @NotBlank String description,
        int sortOrder
) {
}
