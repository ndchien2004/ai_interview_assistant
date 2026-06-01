package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.dto.user.PasswordUpdateRequest;
import com.ndchien12.aiinterview.dto.user.PhoneOtpChallengeResponse;
import com.ndchien12.aiinterview.dto.user.PhoneOtpRequest;
import com.ndchien12.aiinterview.dto.user.PhoneOtpVerifyRequest;
import com.ndchien12.aiinterview.dto.user.UserProfileUpdateRequest;
import com.ndchien12.aiinterview.service.AuthService;
import com.ndchien12.aiinterview.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AuthService authService;
    private final UserProfileService userProfileService;

    public UserController(AuthService authService, UserProfileService userProfileService) {
        this.authService = authService;
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return authService.getCurrentUser(authentication.getName());
    }

    @PutMapping("/me")
    public UserResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return userProfileService.updateProfile(authentication.getName(), request);
    }

    @PutMapping("/me/password")
    public UserResponse updatePassword(
            Authentication authentication,
            @Valid @RequestBody PasswordUpdateRequest request
    ) {
        return userProfileService.updatePassword(authentication.getName(), request);
    }

    @PostMapping("/me/phone/otp")
    public PhoneOtpChallengeResponse issuePhoneOtp(
            Authentication authentication,
            @Valid @RequestBody PhoneOtpRequest request
    ) {
        return userProfileService.issuePhoneOtp(authentication.getName(), request);
    }

    @PutMapping("/me/phone/verify")
    public UserResponse verifyPhoneOtp(
            Authentication authentication,
            @Valid @RequestBody PhoneOtpVerifyRequest request
    ) {
        return userProfileService.verifyPhoneOtp(authentication.getName(), request);
    }

    @PostMapping("/me/avatar")
    public UserResponse uploadAvatar(
            Authentication authentication,
            @RequestPart("file") MultipartFile file
    ) {
        return userProfileService.uploadAvatar(authentication.getName(), file);
    }

    @DeleteMapping("/me/avatar")
    public UserResponse removeAvatar(Authentication authentication) {
        return userProfileService.removeAvatar(authentication.getName());
    }
}
