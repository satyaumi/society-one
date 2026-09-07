package com.societyone.app.auth.service;

import com.societyone.app.common.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Active Email implementation of OtpSender delegating directly to existing EmailService.
 */
@Component
public class EmailOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(EmailOtpSender.class);

    private final EmailService emailService;

    public EmailOtpSender(EmailService emailService) {
        this.emailService = emailService;
    }

    @Override
    public OtpChannel getChannel() {
        return OtpChannel.EMAIL;
    }

    @Override
    public void sendOtp(String recipient, String otp, String purpose, long ttlMinutes) {
        log.info("[EmailOtpSender] Dispatching OTP to email={} purpose={}", recipient, purpose);
        emailService.sendOtpEmail(recipient, otp, purpose, ttlMinutes);
    }
}
