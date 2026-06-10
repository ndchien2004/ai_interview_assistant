package com.ndchien12.aiinterview.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.ndchien12.aiinterview.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryAvatarService {
    private static final long MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

    private final Cloudinary cloudinary;
    private final boolean configured;

    public CloudinaryAvatarService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            @Value("${app.cloudinary.url:}") String cloudinaryUrl
    ) {
        if (hasText(cloudinaryUrl)) {
            this.cloudinary = new Cloudinary(cloudinaryUrl);
            this.configured = true;
        } else if (hasText(cloudName) && hasText(apiKey) && hasText(apiSecret)) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName.trim(),
                    "api_key", apiKey.trim(),
                    "api_secret", apiSecret.trim()
            ));
            this.configured = true;
        } else {
            this.cloudinary = null;
            this.configured = false;
        }
    }

    public AvatarUploadResult uploadAvatar(UUID userId, MultipartFile file) {
        ensureConfigured();
        validateImage(file);

        String publicId = "freecard/users/%s/avatar/profile-avatar".formatted(userId);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId,
                    "overwrite", true,
                    "resource_type", "image",
                    "invalidate", true
            ));
            Object secureUrl = result.get("secure_url");
            if (secureUrl == null || secureUrl.toString().isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Cloudinary did not return an avatar URL");
            }
            return new AvatarUploadResult(secureUrl.toString(), publicId);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read avatar file");
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to upload avatar to Cloudinary");
        }
    }

    public void deleteAvatar(String publicId) {
        if (!configured || publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", "image",
                    "invalidate", true
            ));
        } catch (IOException | RuntimeException ignored) {
            // Clearing the profile should not be blocked by a stale Cloudinary asset.
        }
    }

    private void ensureConfigured() {
        if (!configured) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Cloudinary avatar upload is not configured");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image is required");
        }
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar image must be smaller than 2MB");
        }

        String contentType = file.getContentType();
        boolean supported = "image/jpeg".equalsIgnoreCase(contentType)
                || "image/png".equalsIgnoreCase(contentType)
                || "image/webp".equalsIgnoreCase(contentType);
        if (!supported) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Avatar must be a JPG, PNG, or WebP image");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isBlank();
    }

    public record AvatarUploadResult(String avatarUrl, String avatarPublicId) {
    }
}
