package com.prabhat.tempmail.service;

import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.repository.InboxRepository;
import com.prabhat.tempmail.repository.EmailRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ExpiryService {
    private final InboxRepository inboxRepository;
    private final EmailRepository emailRepository;

    public ExpiryService(InboxRepository inboxRepository, EmailRepository emailRepository) {
        this.inboxRepository = inboxRepository;
        this.emailRepository = emailRepository;
    }

    @Scheduled(fixedRate = 60000) // Run every 1 minute
    public void cleanExpiredData() {
        Instant now = Instant.now();
        List<Inbox> expiredInboxes = inboxRepository.findAll().stream()
                .filter(inbox -> inbox.getExpiresAt().isBefore(now))
                .toList();
        expiredInboxes.forEach(inbox -> {
            List<Email> emails = emailRepository.findByInboxIdOrderByReceivedAtDesc(inbox.getId());
            emailRepository.deleteAll(emails);
            inboxRepository.delete(inbox);
        });
    }
}
