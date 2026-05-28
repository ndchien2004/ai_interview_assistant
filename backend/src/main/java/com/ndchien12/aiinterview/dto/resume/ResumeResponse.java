package com.ndchien12.aiinterview.dto.resume;

import com.ndchien12.aiinterview.entity.Resume;
import com.ndchien12.aiinterview.entity.ResumeStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record ResumeResponse(
        UUID id,
        UUID userId,
        String fileName,
        long fileSize,
        String contentType,
        Instant uploadedAt,
        String parsedText,
        String summary,
        ResumeStatus status,
        String parseError,
        List<String> skills,
        List<String> roleSignals,
        List<String> senioritySignals,
        List<String> projectHighlights,
        List<String> warnings
) {
    public static ResumeResponse from(Resume resume) {
        return new ResumeResponse(
                resume.getId(),
                resume.getUser().getId(),
                resume.getFileName(),
                resume.getFileSize(),
                resume.getContentType(),
                resume.getUploadedAt(),
                resume.getParsedText(),
                resume.getSummary(),
                resume.getStatus(),
                resume.getParseError(),
                new ArrayList<>(resume.getSkills()),
                new ArrayList<>(resume.getRoleSignals()),
                new ArrayList<>(resume.getSenioritySignals()),
                new ArrayList<>(resume.getProjectHighlights()),
                new ArrayList<>(resume.getWarnings())
        );
    }
}
