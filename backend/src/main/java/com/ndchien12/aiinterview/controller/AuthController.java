package com.ndchien12.aiinterview.controller;

import com.ndchien12.aiinterview.dto.auth.AuthResponse;
import com.ndchien12.aiinterview.dto.auth.GoogleAuthRequest;
import com.ndchien12.aiinterview.dto.auth.LoginRequest;
import com.ndchien12.aiinterview.dto.auth.OtpChallengeResponse;
import com.ndchien12.aiinterview.dto.auth.RegisterRequest;
import com.ndchien12.aiinterview.dto.auth.ResendOtpRequest;
import com.ndchien12.aiinterview.dto.auth.VerifyRegistrationRequest;
import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public OtpChallengeResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/register/verify")
    public AuthResponse verifyRegistration(@Valid @RequestBody VerifyRegistrationRequest request) {
        return authService.verifyRegistration(request);
    }

    @PostMapping("/register/resend-otp")
    public OtpChallengeResponse resendRegistrationOtp(@Valid @RequestBody ResendOtpRequest request) {
        return authService.resendRegistrationOtp(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleAuthRequest request) {
        return authService.loginWithGoogle(request);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return authService.getCurrentUser(authentication.getName());
    }
}
