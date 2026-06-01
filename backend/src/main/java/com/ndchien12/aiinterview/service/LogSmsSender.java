package com.ndchien12.aiinterview.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "log", matchIfMissing = true)
public class LogSmsSender implements SmsSender {
    private static final Logger LOGGER = LoggerFactory.getLogger(LogSmsSender.class);

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        LOGGER.info("Phone OTP for {} is {}. APP_SMS_PROVIDER=log does not send real SMS.", phoneNumber, otp);
    }
}
