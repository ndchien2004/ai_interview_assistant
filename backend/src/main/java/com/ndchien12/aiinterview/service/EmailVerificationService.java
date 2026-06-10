package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.entity.PendingRegistration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class EmailVerificationService {
    private static final Logger LOGGER = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final int OTP_BOUND = 1_000_000;

    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final boolean mailEnabled;
    private final String mailFrom;
    private final Duration otpTtl;

    public EmailVerificationService(
            PasswordEncoder passwordEncoder,
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@freecard.local}") String mailFrom,
            @Value("${app.auth.otp-expiration-minutes:10}") long otpExpirationMinutes
    ) {
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.otpTtl = Duration.ofMinutes(otpExpirationMinutes);
    }

    public long issueRegistrationOtp(PendingRegistration pendingRegistration) {
        String otp = "%06d".formatted(secureRandom.nextInt(OTP_BOUND));
        Instant now = Instant.now();

        pendingRegistration.setOtpCodeHash(passwordEncoder.encode(otp));
        pendingRegistration.setOtpExpiresAt(now.plus(otpTtl));
        pendingRegistration.setOtpSentAt(now);
        pendingRegistration.setOtpAttempts(0);

        sendOtp(pendingRegistration, otp);
        return otpTtl.toSeconds();
    }

    public boolean matches(PendingRegistration pendingRegistration, String otp) {
        String codeHash = pendingRegistration.getOtpCodeHash();
        return codeHash != null && passwordEncoder.matches(otp, codeHash);
    }

    private void sendOtp(PendingRegistration pendingRegistration, String otp) {
        if (mailEnabled && mailSender != null) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(pendingRegistration.getEmail());
            message.setSubject("Verify your FreeCard account");
            message.setText("""
                    Hi %s,

                    Your verification code is %s.
                    It expires in %d minutes.

                    If you did not create this account, you can ignore this email.
                    """.formatted(pendingRegistration.getName(), otp, otpTtl.toMinutes()));
            mailSender.send(message);
            return;
        }

        LOGGER.info("Registration OTP for {} is {}. Set MAIL_ENABLED=true to send it by email.", pendingRegistration.getEmail(), otp);
    }
}
