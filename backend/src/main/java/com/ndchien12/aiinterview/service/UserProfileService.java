package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.user.PasswordUpdateRequest;
import com.ndchien12.aiinterview.dto.user.UserProfileUpdateRequest;
import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.entity.AuthProvider;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

@Service
public class UserProfileService {
    private static final int MAX_NAME_CHANGES = 3;
    private static final Duration NAME_CHANGE_COOLDOWN = Duration.ofDays(30);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryAvatarService cloudinaryAvatarService;

    public UserProfileService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            CloudinaryAvatarService cloudinaryAvatarService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cloudinaryAvatarService = cloudinaryAvatarService;
    }

    @Transactional
    public UserResponse updateProfile(String email, UserProfileUpdateRequest request) {
        User user = findUser(email);
        updateName(user, request.name().trim());
        updateDateOfBirth(user, request.dateOfBirth());
        user.setHeadline(safeString(request.headline()));
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse updatePassword(String email, PasswordUpdateRequest request) {
        User user = findUser(email);

        if (user.isPasswordSet()) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is required");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordSet(true);
        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            user.setAuthProvider(AuthProvider.LOCAL_AND_GOOGLE);
        }

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse uploadAvatar(String email, MultipartFile file) {
        User user = findUser(email);
        CloudinaryAvatarService.AvatarUploadResult result =
                cloudinaryAvatarService.uploadAvatar(user.getId(), file);
        user.setAvatarUrl(result.avatarUrl());
        user.setAvatarPublicId(result.avatarPublicId());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse removeAvatar(String email) {
        User user = findUser(email);
        cloudinaryAvatarService.deleteAvatar(user.getAvatarPublicId());
        user.setAvatarUrl(null);
        user.setAvatarPublicId(null);
        return UserResponse.from(userRepository.save(user));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private void updateName(User user, String nextName) {
        if (nextName.equals(user.getName())) {
            return;
        }
        if (user.getNameChangeCount() >= MAX_NAME_CHANGES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name change limit has been reached");
        }
        Instant lastChangedAt = user.getNameLastChangedAt();
        if (lastChangedAt != null && Instant.now().isBefore(lastChangedAt.plus(NAME_CHANGE_COOLDOWN))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Name can only be changed once every 30 days");
        }
        user.setName(nextName);
        user.setNameChangeCount(user.getNameChangeCount() + 1);
        user.setNameLastChangedAt(Instant.now());
    }

    private void updateDateOfBirth(User user, LocalDate nextDateOfBirth) {
        if (nextDateOfBirth == null) {
            return;
        }
        if (user.getDateOfBirth() != null && !user.getDateOfBirth().equals(nextDateOfBirth)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Date of birth can only be set once");
        }
        if (user.getDateOfBirth() == null) {
            user.setDateOfBirth(nextDateOfBirth);
            user.setDateOfBirthSetAt(Instant.now());
        }
    }

}
