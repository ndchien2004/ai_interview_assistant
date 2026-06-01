package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.user.PasswordUpdateRequest;
import com.ndchien12.aiinterview.dto.user.PhoneOtpChallengeResponse;
import com.ndchien12.aiinterview.dto.user.PhoneOtpRequest;
import com.ndchien12.aiinterview.dto.user.PhoneOtpVerifyRequest;
import com.ndchien12.aiinterview.dto.user.UserProfileUpdateRequest;
import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.entity.AuthProvider;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.UserRepository;
import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
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
    private static final Duration PHONE_OTP_RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int PHONE_OTP_MAX_ATTEMPTS = 5;
    private static final PhoneNumberUtil PHONE_NUMBER_UTIL = PhoneNumberUtil.getInstance();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CloudinaryAvatarService cloudinaryAvatarService;
    private final PhoneVerificationService phoneVerificationService;

    public UserProfileService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            CloudinaryAvatarService cloudinaryAvatarService,
            PhoneVerificationService phoneVerificationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.cloudinaryAvatarService = cloudinaryAvatarService;
        this.phoneVerificationService = phoneVerificationService;
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
    public PhoneOtpChallengeResponse issuePhoneOtp(String email, PhoneOtpRequest request) {
        User user = findUser(email);
        String phoneNumber = normalizePhone(request);

        if (phoneNumber.equals(user.getPhoneNumber())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This phone number is already verified");
        }

        Instant sentAt = user.getPhoneOtpSentAt();
        if (sentAt != null && Instant.now().isBefore(sentAt.plus(PHONE_OTP_RESEND_COOLDOWN))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another phone OTP");
        }

        long expiresInSeconds = phoneVerificationService.issuePhoneOtp(user, phoneNumber);
        userRepository.save(user);
        return new PhoneOtpChallengeResponse(
                phoneNumber,
                true,
                expiresInSeconds,
                "OTP has been issued for this phone number"
        );
    }

    @Transactional
    public UserResponse verifyPhoneOtp(String email, PhoneOtpVerifyRequest request) {
        User user = findUser(email);
        String phoneNumber = user.getPendingPhoneNumber();

        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Phone verification request was not found");
        }
        if (user.getPhoneOtpExpiresAt() == null || Instant.now().isAfter(user.getPhoneOtpExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP has expired. Please request a new code");
        }
        if (user.getPhoneOtpAttempts() >= PHONE_OTP_MAX_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many invalid OTP attempts. Please request a new code");
        }
        if (!phoneVerificationService.matches(user, request.otp())) {
            user.setPhoneOtpAttempts(user.getPhoneOtpAttempts() + 1);
            userRepository.save(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "OTP is invalid");
        }

        user.setPhoneNumber(phoneNumber);
        user.setPhoneVerifiedAt(Instant.now());
        clearPhoneOtp(user);
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

    private String normalizePhone(PhoneOtpRequest request) {
        String countryIso = request.countryIso() == null
                ? ""
                : request.countryIso().trim().toUpperCase(Locale.ROOT);
        String nationalNumber = request.nationalNumber() == null ? "" : request.nationalNumber().trim();

        try {
            Phonenumber.PhoneNumber phoneNumber = PHONE_NUMBER_UTIL.parse(nationalNumber, countryIso);
            if (!PHONE_NUMBER_UTIL.isValidNumberForRegion(phoneNumber, countryIso)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Phone number is invalid for the selected country");
            }
            return PHONE_NUMBER_UTIL.format(phoneNumber, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Phone number is invalid for the selected country");
        }
    }

    private void clearPhoneOtp(User user) {
        user.setPendingPhoneNumber(null);
        user.setPhoneOtpCodeHash(null);
        user.setPhoneOtpExpiresAt(null);
        user.setPhoneOtpSentAt(null);
        user.setPhoneOtpAttempts(0);
    }
}
