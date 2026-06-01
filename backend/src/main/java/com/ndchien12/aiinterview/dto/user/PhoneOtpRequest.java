package com.ndchien12.aiinterview.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhoneOtpRequest(
        @NotBlank(message = "Country is required")
        @Size(min = 2, max = 2, message = "Country must be an ISO-3166 alpha-2 code")
        String countryIso,

        @NotBlank(message = "Phone number is required")
        @Size(max = 32, message = "Phone number is too long")
        String nationalNumber
) {
}
