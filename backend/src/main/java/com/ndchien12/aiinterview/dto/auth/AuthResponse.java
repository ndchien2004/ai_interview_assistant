package com.ndchien12.aiinterview.dto.auth;

import com.ndchien12.aiinterview.dto.user.UserResponse;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresInMs,
        UserResponse user
) {
}
