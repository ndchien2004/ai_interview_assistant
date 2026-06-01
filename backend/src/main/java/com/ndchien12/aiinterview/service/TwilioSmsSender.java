package com.ndchien12.aiinterview.service;

import com.ndchien12.aiinterview.exception.ApiException;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "twilio")
public class TwilioSmsSender implements SmsSender {
    private final String accountSid;
    private final String authToken;
    private final String fromPhoneNumber;
    private final String messagingServiceSid;

    public TwilioSmsSender(
            @Value("${app.twilio.account-sid:}") String accountSid,
            @Value("${app.twilio.auth-token:}") String authToken,
            @Value("${app.twilio.from-phone-number:}") String fromPhoneNumber,
            @Value("${app.twilio.messaging-service-sid:}") String messagingServiceSid
    ) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromPhoneNumber = fromPhoneNumber;
        this.messagingServiceSid = messagingServiceSid;
    }

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        ensureConfigured();
        Twilio.init(accountSid, authToken);

        String body = "Your AI Interview verification code is %s. It expires in 10 minutes.".formatted(otp);
        if (hasText(messagingServiceSid)) {
            Message.creator(new PhoneNumber(phoneNumber), messagingServiceSid, body).create();
            return;
        }

        Message.creator(new PhoneNumber(phoneNumber), new PhoneNumber(fromPhoneNumber), body).create();
    }

    private void ensureConfigured() {
        if (!hasText(accountSid) || !hasText(authToken) || (!hasText(fromPhoneNumber) && !hasText(messagingServiceSid))) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SMS provider is not configured");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
