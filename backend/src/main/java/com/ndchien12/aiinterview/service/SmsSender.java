package com.ndchien12.aiinterview.service;

public interface SmsSender {
    void sendOtp(String phoneNumber, String otp);
}
