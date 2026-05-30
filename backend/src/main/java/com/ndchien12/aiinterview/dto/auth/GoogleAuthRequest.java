package com.ndchien12.aiinterview.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "Google credential is required")
        String idToken
) {
}
