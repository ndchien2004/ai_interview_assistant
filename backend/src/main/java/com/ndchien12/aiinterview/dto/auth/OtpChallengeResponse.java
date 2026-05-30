package com.ndchien12.aiinterview.dto.auth;

public record OtpChallengeResponse(
        String email,
        boolean otpRequired,
        long expiresInSeconds,
        String message
) {
}
