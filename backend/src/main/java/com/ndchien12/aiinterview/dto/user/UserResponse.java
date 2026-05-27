package com.ndchien12.aiinterview.dto.user;

import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String headline,
        Role role,
        Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getHeadline(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
