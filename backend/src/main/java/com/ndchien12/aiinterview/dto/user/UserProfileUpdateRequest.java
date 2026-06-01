package com.ndchien12.aiinterview.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UserProfileUpdateRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 120, message = "Name must be 120 characters or fewer")
        String name,

        @Size(max = 240, message = "Headline must be 240 characters or fewer")
        String headline,

        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth
) {
}
