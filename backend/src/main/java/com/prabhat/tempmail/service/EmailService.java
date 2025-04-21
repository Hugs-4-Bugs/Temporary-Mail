package com.prabhat.tempmail.service;

import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.repository.EmailRepository;
import com.prabhat.tempmail.repository.InboxRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EmailService {
    private final EmailRepository emailRepository;
    private final InboxRepository inboxRepository;

    @Value("${tempmail.expiry.minutes:10}")
    private int otpExpiryMinutes;

    public EmailService(EmailRepository emailRepository, InboxRepository inboxRepository) {
        this.emailRepository = emailRepository;
        this.inboxRepository = inboxRepository;
    }

    @Transactional
    public Email saveEmail(UUID inboxId, String sender, String subject, String content) {
        // Check if it's an OTP email and extract the OTP code
        String otp = extractOTP(content);

        // Create expiry time for OTP (if present)
        Instant expiresAt = null;
        if (otp != null && !otp.isEmpty()) {
            expiresAt = Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES);
        }

        // Look up the recipient address
        Optional<Inbox> inboxOpt = inboxRepository.findById(inboxId);
        String recipient = inboxOpt.isPresent() ? inboxOpt.get().getEmailAddress() : "";

        Email email = Email.builder()
                .inboxId(inboxId)
                .sender(sender)
                .recipient(recipient)
                .subject(subject)
                .content(content)
                .receivedAt(Instant.now())
                .otp(otp)
                .otpExpiresAt(expiresAt)
                .deleted(false)
                .build();

        return emailRepository.save(email);
    }

    public List<Email> getEmailsByInbox(UUID inboxId) {
        return emailRepository.findByInboxIdOrderByReceivedAtDesc(inboxId);
    }

    public Optional<Email> getEmail(Long id) {
        return emailRepository.findById(id);
    }

    @Transactional
    public void deleteEmail(Long id) {
        // Soft delete by setting deleted flag
        emailRepository.findById(id).ifPresent(email -> {
            email.setDeleted(true);
            emailRepository.save(email);
        });
    }

    @Transactional
    public void deleteEmailsByInbox(UUID inboxId) {
        List<Email> emails = emailRepository.findByInboxIdOrderByReceivedAtDesc(inboxId);
        emails.forEach(email -> email.setDeleted(true));
        emailRepository.saveAll(emails);
    }

    /**
     * Extract OTP number from email content
     * Looks for common OTP patterns like 6-digit codes
     */
    private String extractOTP(String content) {
        if (content == null) return null;

        // Common patterns for OTP in emails
        Pattern[] patterns = {
            // 6-digit code pattern
            Pattern.compile("\\b(\\d{6})\\b"),
            // OTP/code/verification pattern followed by numbers
            Pattern.compile("(?i)(?:otp|code|verification|pin)\\s*(?:is|:)\\s*(\\d+)"),
            // Numbers in specific HTML contexts that might indicate codes
            Pattern.compile("<strong>(\\d{4,8})</strong>"),
            Pattern.compile("<b>(\\d{4,8})</b>")
        };

        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(content);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }

        return null;
    }
}
