package com.societyone.app.common.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${societyone.mail.from:noreply@societyone.com}")
    private String fromEmail;

    @Value("${societyone.mail.from-name:SocietyOne}")
    private String fromName;

    @Value("${societyone.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    /**
     * Send an OTP verification email to the user.
     *
     * @param toEmail      Recipient email address
     * @param otp          Generated 6-digit OTP
     * @param purpose      Purpose (PASSWORD_RESET, SIGNUP, EMAIL_CHANGE, etc.)
     * @param validMinutes Expiration time in minutes
     */
    public void sendOtpEmail(String toEmail, String otp, String purpose, long validMinutes) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("[EmailService] Cannot send OTP email: recipient email is blank.");
            return;
        }

        String subject = switch (purpose.toUpperCase()) {
            case "PASSWORD_RESET" -> "SocietyOne - Password Reset Code";
            case "SIGNUP" -> "SocietyOne - Verify Your Email Address";
            case "EMAIL_CHANGE" -> "SocietyOne - Confirm Your New Email";
            default -> "SocietyOne - Verification Code";
        };

        String purposeDescription = switch (purpose.toUpperCase()) {
            case "PASSWORD_RESET" -> "reset the password for your SocietyOne account";
            case "SIGNUP" -> "complete your SocietyOne account registration";
            case "EMAIL_CHANGE" -> "verify your new email address on SocietyOne";
            default -> "complete your verification on SocietyOne";
        };

        String htmlContent = buildOtpHtml(otp, purposeDescription, validMinutes);
        String textContent = buildOtpText(otp, purposeDescription, validMinutes);

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        boolean hasCredentials = mailUsername != null && !mailUsername.isBlank();

        if (!mailEnabled) {
            log.warn("[EmailService] Email sending is disabled (mailEnabled=false). [DEV OTP] To: {} | OTP: {}", toEmail, otp);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery is disabled on this server.");
        }

        if (mailSender == null || !hasCredentials) {
            log.warn("[EmailService] Real SMTP transmission skipped: SMTP credentials are not configured! " +
                     "Please set SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD in societyone-backend/.env to send real emails. " +
                     "[DEV OTP FALLBACK] To: {} | Subject: '{}' | OTP: {} (valid for {} mins)",
                    toEmail, subject, otp, validMinutes);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email service is not configured with SMTP credentials. Please configure your Gmail address and Google App Password in societyone-backend/.env to send real emails."
            );
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail.trim());
            helper.setSubject(subject);
            helper.setText(textContent, htmlContent);

            mailSender.send(message);
            log.info("[EmailService] OTP email successfully dispatched to {} for purpose {}", toEmail, purpose);

        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("[EmailService] Failed to create MIME message for {}: {}", toEmail, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to prepare verification email");
        } catch (MailException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("AuthenticationFailedException") || msg.contains("535") || msg.contains("Username and Password not accepted")) {
                log.error("[EmailService] SMTP authentication failed for {}: Google rejected the credentials. " +
                          "Ensure you are using a 16-character Google App Password (not your normal Gmail password), " +
                          "and that 2-Step Verification is enabled on your Google account.", toEmail);
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "SMTP authentication failed. If using Gmail, ensure 2-Step Verification is active and use a 16-character Google App Password."
                );
            }
            log.error("[EmailService] SMTP transmission failed for {}: {}", toEmail, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to send verification email via SMTP: " + e.getMessage());
        }
    }

    private String buildOtpHtml(String otp, String purposeDescription, long validMinutes) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>SocietyOne Verification Code</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .container { max-width: 560px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background-color: #0f172a; padding: 28px 32px; text-align: center; }
                .brand { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
                .content { padding: 36px 32px; color: #334155; line-height: 1.6; }
                .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
                .otp-box { margin: 28px 0; padding: 20px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; text-align: center; }
                .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #2563eb; letter-spacing: 8px; margin: 0; }
                .expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
                .notice { font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; }
                .footer { background-color: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="brand">SocietyOne</div>
                </div>
                <div class="content">
                  <div class="greeting">Verification Code</div>
                  <p>You requested a one-time verification code to %s.</p>
                  <div class="otp-box">
                    <div class="otp-code">%s</div>
                    <div class="expiry">This code will expire in %d minutes.</div>
                  </div>
                  <p>Enter this 6-digit code in SocietyOne to proceed. Never share this code with anyone.</p>
                  <div class="notice">
                    If you did not request this verification code, you can safely ignore this email. No changes will be made to your account.
                  </div>
                </div>
                <div class="footer">
                  &copy; SocietyOne Residential Management. All rights reserved.
                </div>
              </div>
            </body>
            </html>
            """.formatted(purposeDescription, otp, validMinutes);
    }

    private String buildOtpText(String otp, String purposeDescription, long validMinutes) {
        return """
            SocietyOne Verification Code
            ============================

            You requested a one-time verification code to %s.

            Your 6-digit code is: %s

            This code expires in %d minutes.

            If you did not request this code, please ignore this email.

            -- SocietyOne Team
            """.formatted(purposeDescription, otp, validMinutes);
    }
}
