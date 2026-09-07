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
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.CompletableFuture;

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

    @Value("${societyone.mail.dev-fallback-enabled:true}")
    private boolean devFallbackEnabled;

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
            if (devFallbackEnabled) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery is disabled on this server.");
        }

        if (mailSender == null || !hasCredentials) {
            log.warn("[EmailService] Real SMTP transmission skipped: SMTP credentials are not configured! " +
                     "Please set SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD in societyone-backend/.env to send real emails. " +
                     "[DEV OTP FALLBACK] To: {} | Subject: '{}' | OTP: {} (valid for {} mins)",
                    toEmail, subject, otp, validMinutes);
            if (devFallbackEnabled) {
                return;
            }
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
            if (devFallbackEnabled) {
                log.warn("[EmailService] MIME creation failed. [DEV OTP FALLBACK] To: {} | OTP: {}", toEmail, otp);
                return;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to prepare verification email");
        } catch (MailException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            log.error("[EmailService] SMTP transmission failed for {}: {}", toEmail, msg);
            log.warn("""
                    ========================================================================================
                    [EmailService - DEV OTP FALLBACK]
                    Real SMTP delivery failed (e.g. Google rejected credentials or SMTP network error).
                    Recipient: {}
                    OTP Code:  {} (valid for {} minutes)
                    Enter this 6-digit OTP code in the verification screen to proceed!
                    ========================================================================================
                    """, toEmail, otp, validMinutes);

            if (devFallbackEnabled) {
                log.info("[EmailService] devFallbackEnabled=true: Allowing OTP verification flow to proceed.");
                return;
            }

            if (msg.contains("AuthenticationFailedException") || msg.contains("535") || msg.contains("Username and Password not accepted")) {
                log.error("[EmailService] SMTP authentication failed for {}: Google rejected the credentials. " +
                          "Ensure you are using a 16-character Google App Password (not your normal Gmail password), " +
                          "and that 2-Step Verification is enabled on your Google account.", toEmail);
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "SMTP authentication failed. If using Gmail, ensure 2-Step Verification is active and use a 16-character Google App Password."
                );
            }
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

    /**
     * Send a welcome email when a user successfully registers / signs up.
     */
    public void sendWelcomeEmail(String toEmail, String fullName, String username, String role) {
        String displayName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : username;
        String formattedRole = formatRoleName(role);
        sendActivityEmailAsync(
                toEmail,
                "Welcome to SocietyOne - Successfully Registered!",
                "Welcome to SocietyOne",
                "Account Created",
                "#10b981",
                displayName,
                "We are delighted to welcome you to the SocietyOne community! Your account has been successfully created and registered. You can now log in, access your residential dashboard, and manage your society services.",
                "Account Signup / Registration",
                formattedRole,
                username,
                "If you did not register this account or believe this was an error, please contact your society administration immediately."
        );
    }

    /**
     * Send a security alert email when a user successfully logs in.
     */
    public void sendLoginAlertEmail(String toEmail, String fullName, String username, String role) {
        String displayName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : username;
        String formattedRole = formatRoleName(role);
        sendActivityEmailAsync(
                toEmail,
                "SocietyOne - Successful Login Alert",
                "Login Notification",
                "Successful Login",
                "#2563eb",
                displayName,
                "This is a security alert to confirm that you have successfully logged in to your SocietyOne account.",
                "Account Login",
                formattedRole,
                username,
                "If you initiated this login, you can safely disregard this message. If you did NOT log in, your credentials may be compromised. Please reset your password immediately and notify society administration."
        );
    }

    /**
     * Send a confirmation email when a user successfully resets or changes their password.
     */
    public void sendPasswordResetSuccessEmail(String toEmail, String fullName, String username) {
        String displayName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : username;
        sendActivityEmailAsync(
                toEmail,
                "SocietyOne - Password Successfully Reset",
                "Password Reset Completed",
                "Password Updated",
                "#059669",
                displayName,
                "Your SocietyOne account password has been successfully reset. You can now use your new password to log in to your account.",
                "Password Reset / Change",
                "Account Security",
                username,
                "If you authorized this password reset, no further action is necessary. If you did NOT make this change, please contact your society administrator immediately."
        );
    }

    private void sendActivityEmailAsync(
            String toEmail,
            String subject,
            String title,
            String badgeText,
            String badgeColor,
            String fullName,
            String mainMessage,
            String activityType,
            String role,
            String username,
            String securityNotice
    ) {
        if (toEmail == null || toEmail.isBlank() || !toEmail.contains("@")) {
            log.warn("[EmailService] Cannot send {} email: invalid or missing recipient email: {}", activityType, toEmail);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        boolean hasCredentials = mailUsername != null && !mailUsername.isBlank();

        if (!mailEnabled || mailSender == null || !hasCredentials) {
            log.info("[EmailService] Activity email skipped (mailEnabled={}, hasCredentials={}). [DEV LOG] To: {} | Activity: {} | Subject: '{}'",
                    mailEnabled, hasCredentials, toEmail, activityType, subject);
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                String formattedTime = DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a")
                        .withZone(ZoneId.of("Asia/Kolkata"))
                        .format(Instant.now());

                String html = buildActivityHtml(
                        title, badgeText, badgeColor, fullName, mainMessage,
                        activityType, role, username, formattedTime, securityNotice
                );
                String text = buildActivityText(
                        title, fullName, mainMessage, activityType, role,
                        username, formattedTime, securityNotice
                );

                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(
                        message,
                        MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                        StandardCharsets.UTF_8.name()
                );

                helper.setFrom(fromEmail, fromName);
                helper.setTo(toEmail.trim());
                helper.setSubject(subject);
                helper.setText(text, html);

                mailSender.send(message);
                log.info("[EmailService] {} activity email successfully dispatched to {}", activityType, toEmail);

            } catch (Exception e) {
                log.warn("[EmailService] Failed to send {} activity email to {}: {}", activityType, toEmail, e.getMessage());
            }
        });
    }

    private String formatRoleName(String role) {
        if (role == null || role.isBlank()) return "Member";
        return switch (role.trim().toUpperCase()) {
            case "ADMIN" -> "Administrator";
            case "RESIDENT" -> "Resident";
            case "SECURITY", "SECURITY_STAFF" -> "Security Staff";
            case "VISITOR" -> "Visitor";
            default -> role.trim();
        };
    }

    private String buildActivityHtml(
            String title,
            String badgeText,
            String badgeColor,
            String fullName,
            String mainMessage,
            String activityType,
            String role,
            String username,
            String formattedTime,
            String securityNotice
    ) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>%s</title>
              <style>
                body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                .container { max-width: 580px; margin: 36px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); padding: 28px 32px; text-align: center; }
                .brand { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
                .brand-sub { color: #94a3b8; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px; }
                .content { padding: 32px; color: #334155; line-height: 1.6; }
                .badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; margin-bottom: 16px; background-color: %s; }
                .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
                .greeting { font-size: 15px; color: #475569; margin-bottom: 16px; }
                .message { font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px; }
                .notice-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #1e40af; line-height: 1.5; margin-top: 20px; }
                .footer { background-color: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="brand">SocietyOne</div>
                  <div class="brand-sub">Residential &amp; Society Management</div>
                </div>
                <div class="content">
                  <span class="badge">%s</span>
                  <div class="title">%s</div>
                  <div class="greeting">Hello <strong>%s</strong>,</div>
                  <p class="message">%s</p>
                  
                  <table style="width: 100%%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500;">Activity</td>
                      <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">%s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500;">Account Role</td>
                      <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">%s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500;">Username</td>
                      <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">%s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500;">Date &amp; Time</td>
                      <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">%s</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500;">Status</td>
                      <td style="padding: 10px 14px; font-size: 13px; color: #10b981; font-weight: 700; text-align: right;">Completed</td>
                    </tr>
                  </table>

                  <div class="notice-box">
                    <strong>Security Notice:</strong> %s
                  </div>
                </div>
                <div class="footer">
                  This is an automated notification from SocietyOne.<br/>
                  &copy; SocietyOne Residential Management. All rights reserved.
                </div>
              </div>
            </body>
            </html>
            """.formatted(title, badgeColor, badgeText, title, fullName, mainMessage, activityType, role, username, formattedTime, securityNotice);
    }

    private String buildActivityText(
            String title,
            String fullName,
            String mainMessage,
            String activityType,
            String role,
            String username,
            String formattedTime,
            String securityNotice
    ) {
        return """
            SocietyOne Notification: %s
            ==============================================

            Hello %s,

            %s

            Activity Details:
            - Activity: %s
            - Account Role: %s
            - Username: %s
            - Date & Time: %s
            - Status: Completed

            Security Notice:
            %s

            -- SocietyOne Residential Management
            """.formatted(title, fullName, mainMessage, activityType, role, username, formattedTime, securityNotice);
    }
}
