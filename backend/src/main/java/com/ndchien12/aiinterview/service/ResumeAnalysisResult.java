package com.ndchien12.aiinterview.service;

import java.util.List;

public record ResumeAnalysisResult(
        String parsedResumeText,
        String summary,
        List<String> skills,
        List<String> roleSignals,
        List<String> senioritySignals,
        List<String> projectHighlights,
        List<String> warnings
) {
}
