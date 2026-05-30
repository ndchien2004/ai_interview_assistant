package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.auth.AuthResponse;
import com.ndchien12.aiinterview.dto.auth.GoogleAuthRequest;
import com.ndchien12.aiinterview.dto.auth.LoginRequest;
import com.ndchien12.aiinterview.dto.auth.OtpChallengeResponse;
import com.ndchien12.aiinterview.dto.auth.RegisterRequest;
import com.ndchien12.aiinterview.dto.auth.ResendOtpRequest;
import com.ndchien12.aiinterview.dto.auth.VerifyRegistrationRequest;
import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.entity.PendingRegistration;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
import com.ndchien12.aiinterview.repository.PendingRegistrationRepository;
import com.ndchien12.aiinterview.repository.UserRepository;
import com.ndchien12.aiinterview.security.JwtService;
import com.ndchien12.aiinterview.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailVerificationService emailVerificationService;
    private final String googleClientId;
    private final JwtDecoder googleJwtDecoder;
    private final Duration otpResendCooldown;
    private final int otpMaxAttempts;

    public AuthService(
            UserRepository userRepository,
            PendingRegistrationRepository pendingRegistrationRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            EmailVerificationService emailVerificationService,
            @Value("${app.google.client-id:}") String googleClientId,
            @Value("${app.auth.otp-resend-cooldown-seconds:60}") long otpResendCooldownSeconds,
            @Value("${app.auth.otp-max-attempts:5}") int otpMaxAttempts
    ) {
        this.userRepository = userRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.emailVerificationService = emailVerificationService;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleJwtDecoder = this.googleClientId.isBlank()
                ? null
                : NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        this.otpResendCooldown = Duration.ofSeconds(otpResendCooldownSeconds);
        this.otpMaxAttempts = otpMaxAttempts;
    }

    @Transactional
    public OtpChallengeResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }

        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail(email)
                .orElseGet(PendingRegistration::new);
        pendingRegistration.setName(request.name().trim());
        pendingRegistration.setEmail(email);
        pendingRegistration.setPasswordHash(passwordEncoder.encode(request.password()));

        long expiresInSeconds = emailVerificationService.issueRegistrationOtp(pendingRegistration);
        PendingRegistration savedRegistration = pendingRegistrationRepository.save(pendingRegistration);

        return otpChallenge(savedRegistration, expiresInSeconds);
    }

    @Transactional
    public AuthResponse verifyRegistration(VerifyRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Verification request was not found"));

        if (userRepository.existsByEmail(email)) {
            pendingRegistrationRepository.delete(pendingRegistration);
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }

        if (pendingRegistration.getOtpExpiresAt() == null
                || Instant.now().isAfter(pendingRegistration.getOtpExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP has expired. Please request a new code");
        }

        if (pendingRegistration.getOtpAttempts() >= otpMaxAttempts) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many invalid OTP attempts. Please request a new code");
        }

        if (!emailVerificationService.matches(pendingRegistration, request.otp())) {
            pendingRegistration.setOtpAttempts(pendingRegistration.getOtpAttempts() + 1);
            pendingRegistrationRepository.save(pendingRegistration);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "OTP is invalid");
        }

        User savedUser = userRepository.save(createUserFromPendingRegistration(pendingRegistration));
        pendingRegistrationRepository.delete(pendingRegistration);
        String token = jwtService.generateToken(UserPrincipal.from(savedUser));

        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), UserResponse.from(savedUser));
    }

    @Transactional
    public OtpChallengeResponse resendRegistrationOtp(ResendOtpRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }

        PendingRegistration pendingRegistration = pendingRegistrationRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Verification request was not found"));

        Instant sentAt = pendingRegistration.getOtpSentAt();
        if (sentAt != null) {
            Instant resendAllowedAt = sentAt.plus(otpResendCooldown);
            if (Instant.now().isBefore(resendAllowedAt)) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another OTP");
            }
        }

        long expiresInSeconds = emailVerificationService.issueRegistrationOtp(pendingRegistration);
        PendingRegistration savedRegistration = pendingRegistrationRepository.save(pendingRegistration);
        return otpChallenge(savedRegistration, expiresInSeconds);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        String token = jwtService.generateToken(UserPrincipal.from(user));

        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), UserResponse.from(user));
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        if (googleJwtDecoder == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Google sign-in is not configured");
        }

        Jwt googleToken = decodeGoogleToken(request.idToken());
        if (!isGoogleIssuer(googleToken)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google credential issuer is invalid");
        }

        if (!googleToken.getAudience().contains(googleClientId)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google credential audience is invalid");
        }

        Boolean emailVerified = googleToken.getClaimAsBoolean("email_verified");
        if (!Boolean.TRUE.equals(emailVerified)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account email is not verified");
        }

        String rawEmail = googleToken.getClaimAsString("email");
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account email is missing");
        }

        String email = normalizeEmail(rawEmail);
        String name = displayName(googleToken, email);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createGoogleUser(email, name, googleToken.getSubject()));
        pendingRegistrationRepository.deleteByEmail(email);

        String token = jwtService.generateToken(UserPrincipal.from(user));
        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return UserResponse.from(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private Jwt decodeGoogleToken(String idToken) {
        try {
            return googleJwtDecoder.decode(idToken);
        } catch (JwtException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google credential is invalid");
        }
    }

    private boolean isGoogleIssuer(Jwt googleToken) {
        if (googleToken.getIssuer() == null) {
            return false;
        }

        String issuer = googleToken.getIssuer().toString();
        return "https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer);
    }

    private User createGoogleUser(String email, String name, String subject) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("google:" + subject + ":" + System.nanoTime()));
        user.setHeadline("Candidate preparing for AI-assisted interviews");
        user.setRole(Role.USER);
        return userRepository.save(user);
    }

    private User createUserFromPendingRegistration(PendingRegistration pendingRegistration) {
        User user = new User();
        user.setName(pendingRegistration.getName());
        user.setEmail(pendingRegistration.getEmail());
        user.setPasswordHash(pendingRegistration.getPasswordHash());
        user.setHeadline("Candidate preparing for AI-assisted interviews");
        user.setRole(Role.USER);
        return user;
    }

    private OtpChallengeResponse otpChallenge(PendingRegistration pendingRegistration, long expiresInSeconds) {
        return new OtpChallengeResponse(
                pendingRegistration.getEmail(),
                true,
                expiresInSeconds,
                "OTP has been sent to your email"
        );
    }

    private String displayName(Jwt googleToken, String email) {
        String name = googleToken.getClaimAsString("name");
        if (name != null && !name.isBlank()) {
            return name.trim();
        }

        String givenName = googleToken.getClaimAsString("given_name");
        if (givenName != null && !givenName.isBlank()) {
            return givenName.trim();
        }

        return email.substring(0, email.indexOf('@'));
    }
}
