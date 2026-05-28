package com.ndchien12.aiinterview.dto.course;

public record TopicProgressResponse(
        String topic,
        long total,
        long attempted,
        long mastered
) {
}
