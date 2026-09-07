package com.societyone.app.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Mobile SMS implementation of OtpSender.
 *
 * CURRENT STATUS:
 * - NOT IMPLEMENTED / Prepared for future extension.
 * - Mobile signup verification is not enabled in the current application flow.
 *
 * FUTURE EXTENSION:
 * To enable mobile SMS verification later:
 * 1. Add your chosen SMS provider client (e.g. MSG91, Twilio, AWS SNS, Infobip).
 * 2. Configure provider credentials in application.yaml / societyone-backend/.env:
 *      societyone.sms.provider=twilio
 *      societyone.sms.account-sid=${SMS_ACCOUNT_SID}
 *      societyone.sms.auth-token=${SMS_AUTH_TOKEN}
 * 3. Replace the stub logic in {@link #sendOtp} with the provider API call.
 */
@Component
public class MobileSmsOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(MobileSmsOtpSender.class);

    @Override
    public OtpChannel getChannel() {
        return OtpChannel.SMS;
    }

    @Override
    public void sendOtp(String recipient, String otp, String purpose, long ttlMinutes) {
        log.warn("[MobileSmsOtpSender] Mobile SMS delivery invoked but is not currently enabled. Recipient={}, purpose={}", recipient, purpose);
        throw new UnsupportedOperationException(
                "Mobile SMS OTP delivery is not yet configured. Please configure an SMS provider (e.g. MSG91, Twilio) to enable mobile SMS OTP."
        );
    }
}
