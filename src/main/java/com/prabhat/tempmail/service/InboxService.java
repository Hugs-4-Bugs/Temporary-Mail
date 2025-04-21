package com.prabhat.tempmail.service;

import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.repository.InboxRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
public class InboxService {
    private final InboxRepository inboxRepository;

    @Value("${tempmail.domain:prabhat.temp}")
    private String mailDomain;
    @Value("${tempmail.expiry.minutes:10}")
    private int inboxExpiryMinutes;

    public InboxService(InboxRepository inboxRepository) {
        this.inboxRepository = inboxRepository;
    }

    public Inbox createInbox() {
        UUID id = UUID.randomUUID();
        String randomEmail = id.toString().replaceAll("-","") + "@" + mailDomain;
        Instant now = Instant.now();
        Instant expiresAt = now.plus(inboxExpiryMinutes, ChronoUnit.MINUTES);
        Inbox inbox = Inbox.builder()
                .id(id)
                .emailAddress(randomEmail)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();
        return inboxRepository.save(inbox);
    }

    public Optional<Inbox> getInbox(UUID uuid) {
        return inboxRepository.findById(uuid);
    }

    public Optional<Inbox> findByEmail(String email) {
        return inboxRepository.findByEmailAddress(email);
    }

    public Inbox changeInboxAddress(UUID uuid) {
        Optional<Inbox> opt = inboxRepository.findById(uuid);
        if (opt.isEmpty()) return null;
        Inbox existing = opt.get();
        String newEmail = UUID.randomUUID().toString().replaceAll("-","") + "@" + mailDomain;
        existing.setEmailAddress(newEmail);
        // Reset expiry to now + expiryMinutes
        existing.setCreatedAt(Instant.now());
        existing.setExpiresAt(Instant.now().plus(inboxExpiryMinutes, ChronoUnit.MINUTES));
        return inboxRepository.save(existing);
    }

    public void deleteInbox(UUID uuid) {
        inboxRepository.deleteById(uuid);
    }
}
