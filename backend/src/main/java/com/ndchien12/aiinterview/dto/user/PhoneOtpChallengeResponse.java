package com.ndchien12.aiinterview.dto.user;

public record PhoneOtpChallengeResponse(
        String phoneNumber,
        boolean otpRequired,
        long expiresInSeconds,
        String message
) {
}
