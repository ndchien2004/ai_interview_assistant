package com.ndchien12.aiinterview.dto.user;

import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.entity.AuthProvider;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String headline,
        LocalDate dateOfBirth,
        Instant dateOfBirthSetAt,
        int nameChangeCount,
        Instant nameLastChangedAt,
        String avatarUrl,
        AuthProvider authProvider,
        boolean passwordSet,
        Role role,
        Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getHeadline(),
                user.getDateOfBirth(),
                user.getDateOfBirthSetAt(),
                user.getNameChangeCount(),
                user.getNameLastChangedAt(),
                user.getAvatarUrl(),
                user.getAuthProvider() == null ? AuthProvider.LOCAL : user.getAuthProvider(),
                user.isPasswordSet(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
