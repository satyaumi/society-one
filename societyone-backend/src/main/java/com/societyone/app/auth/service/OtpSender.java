package com.societyone.app.auth.service;

/**
 * Provider-agnostic interface for sending one-time passcodes over supported communication channels.
 */
public interface OtpSender {

    /**
     * Identifies the channel supported by this sender.
     */
    OtpChannel getChannel();

    /**
     * Dispatches an OTP to the target recipient.
     *
     * @param recipient  target address (e.g. email or E.164 phone number)
     * @param otp        the generated one-time passcode
     * @param purpose    context for the OTP (e.g. SIGNUP_EMAIL, PASSWORD_RESET)
     * @param ttlMinutes validity duration in minutes
     */
    void sendOtp(String recipient, String otp, String purpose, long ttlMinutes);
}
