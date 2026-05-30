package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.dto.auth.AuthResponse;
import com.ndchien12.aiinterview.dto.auth.GoogleAuthRequest;
import com.ndchien12.aiinterview.dto.auth.LoginRequest;
import com.ndchien12.aiinterview.dto.auth.RegisterRequest;
import com.ndchien12.aiinterview.dto.user.UserResponse;
import com.ndchien12.aiinterview.entity.Role;
import com.ndchien12.aiinterview.entity.User;
import com.ndchien12.aiinterview.exception.ApiException;
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

import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final String googleClientId;
    private final JwtDecoder googleJwtDecoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            @Value("${app.google.client-id:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleJwtDecoder = this.googleClientId.isBlank()
                ? null
                : NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setHeadline("Candidate preparing for AI-assisted interviews");
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(UserPrincipal.from(savedUser));

        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), UserResponse.from(savedUser));
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
