package com.prabhat.tempmail.service;

import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.repository.EmailRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmailService {
    private final EmailRepository emailRepository;

    public EmailService(EmailRepository emailRepository) {
        this.emailRepository = emailRepository;
    }

    public Email saveEmail(UUID inboxId, String sender, String subject, String content) {
        Email email = Email.builder()
                .inboxId(inboxId)
                .sender(sender)
                .subject(subject)
                .content(content)
                .receivedAt(Instant.now())
                .build();
        return emailRepository.save(email);
    }

    public List<Email> getEmailsByInbox(UUID inboxId) {
        return emailRepository.findByInboxIdOrderByReceivedAtDesc(inboxId);
    }

    public Optional<Email> getEmail(Long id) {
        return emailRepository.findById(id);
    }

    public void deleteEmail(Long id) {
        emailRepository.deleteById(id);
    }

    public void deleteEmailsByInbox(UUID inboxId) {
        List<Email> emails = emailRepository.findByInboxIdOrderByReceivedAtDesc(inboxId);
        emailRepository.deleteAll(emails);
    }
}
