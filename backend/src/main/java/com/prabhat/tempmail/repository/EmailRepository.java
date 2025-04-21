package com.prabhat.tempmail.repository;

import com.prabhat.tempmail.model.Email;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface EmailRepository extends JpaRepository<Email, Long> {
    List<Email> findByInboxIdOrderByReceivedAtDesc(UUID inboxId);
}
