package com.prabhat.tempmail.repository;

import com.prabhat.tempmail.model.Inbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;

public interface InboxRepository extends JpaRepository<Inbox, UUID> {
    Optional<Inbox> findByEmailAddress(String emailAddress);
}
