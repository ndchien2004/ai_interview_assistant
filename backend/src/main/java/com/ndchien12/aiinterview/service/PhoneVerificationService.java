package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class PhoneVerificationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PhoneVerificationService.class);
    private static final int OTP_BOUND = 1_000_000;

    private final PasswordEncoder passwordEncoder;
    private final SmsSender smsSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration otpTtl;

    public PhoneVerificationService(
            PasswordEncoder passwordEncoder,
            SmsSender smsSender,
            @Value("${app.auth.otp-expiration-minutes:10}") long otpExpirationMinutes
    ) {
        this.passwordEncoder = passwordEncoder;
        this.smsSender = smsSender;
        this.otpTtl = Duration.ofMinutes(otpExpirationMinutes);
    }

    public long issuePhoneOtp(User user, String phoneNumber) {
        String otp = "%06d".formatted(secureRandom.nextInt(OTP_BOUND));
        Instant now = Instant.now();

        user.setPendingPhoneNumber(phoneNumber);
        user.setPhoneOtpCodeHash(passwordEncoder.encode(otp));
        user.setPhoneOtpExpiresAt(now.plus(otpTtl));
        user.setPhoneOtpSentAt(now);
        user.setPhoneOtpAttempts(0);

        smsSender.sendOtp(phoneNumber, otp);
        LOGGER.info("Issued phone OTP for user {} and phone {}", user.getEmail(), phoneNumber);
        return otpTtl.toSeconds();
    }

    public boolean matches(User user, String otp) {
        String codeHash = user.getPhoneOtpCodeHash();
        return codeHash != null && passwordEncoder.matches(otp, codeHash);
    }
}
