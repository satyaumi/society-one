package com.societyone.app.auth.service;

import com.societyone.app.common.email.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;

class OtpDeliveryServiceTest {

    @Test
    @DisplayName("OtpDeliveryService routes EMAIL channel to EmailOtpSender")
    void testEmailDeliveryRouting() {
        EmailService mockEmailService = Mockito.mock(EmailService.class);
        EmailOtpSender emailSender = new EmailOtpSender(mockEmailService);
        MobileSmsOtpSender smsSender = new MobileSmsOtpSender();

        OtpDeliveryService deliveryService = new OtpDeliveryService(List.of(emailSender, smsSender));

        deliveryService.send(OtpChannel.EMAIL, "user@example.com", "123456", "SIGNUP_EMAIL", 10L);

        verify(mockEmailService).sendOtpEmail("user@example.com", "123456", "SIGNUP_EMAIL", 10L);
    }

    @Test
    @DisplayName("MobileSmsOtpSender throws UnsupportedOperationException explaining provider setup")
    void testSmsDeliveryStub() {
        MobileSmsOtpSender smsSender = new MobileSmsOtpSender();

        assertThrows(UnsupportedOperationException.class, () ->
                smsSender.sendOtp("+919876543210", "123456", "SIGNUP_SMS", 10L)
        );
    }
}
