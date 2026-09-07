package com.societyone.app.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Central routing service for OTP delivery across configured channels (EMAIL, SMS).
 */
@Service
public class OtpDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(OtpDeliveryService.class);

    private final Map<OtpChannel, OtpSender> senders = new EnumMap<>(OtpChannel.class);

    public OtpDeliveryService(List<OtpSender> senderList) {
        for (OtpSender sender : senderList) {
            senders.put(sender.getChannel(), sender);
            log.info("[OtpDeliveryService] Registered OTP sender for channel: {}", sender.getChannel());
        }
    }

    /**
     * Dispatches an OTP over the specified channel.
     *
     * @param channel    communication channel (EMAIL, SMS)
     * @param recipient  recipient email or phone
     * @param otp        generated 6-digit code
     * @param purpose    context/purpose identifier
     * @param ttlMinutes expiration in minutes
     */
    public void send(OtpChannel channel, String recipient, String otp, String purpose, long ttlMinutes) {
        OtpSender sender = senders.get(channel);
        if (sender == null) {
            log.error("[OtpDeliveryService] No OTP sender available for channel: {}", channel);
            throw new UnsupportedOperationException("No OTP sender configured for channel: " + channel);
        }
        sender.sendOtp(recipient, otp, purpose, ttlMinutes);
    }
}
