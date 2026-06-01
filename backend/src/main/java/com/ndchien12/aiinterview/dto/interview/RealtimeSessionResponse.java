package com.ndchien12.aiinterview.dto.interview;

public record RealtimeSessionResponse(
        boolean enabled,
        String clientSecret,
        String model,
        String voice,
        String message
) {
    public static RealtimeSessionResponse disabled(String model, String voice, String message) {
        return new RealtimeSessionResponse(false, null, model, voice, message);
    }
}
