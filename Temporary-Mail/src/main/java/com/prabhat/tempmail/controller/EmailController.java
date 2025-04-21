package com.prabhat.tempmail.controller;

import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EmailController {
    private final EmailService emailService;

    @GetMapping("/inbox/{uuid}/emails")
    public ResponseEntity<List<Email>> getEmailsByInbox(@PathVariable UUID uuid) {
        return ResponseEntity.ok(emailService.getEmailsByInbox(uuid));
    }

    @GetMapping("/email/{id}")
    public ResponseEntity<Email> getEmail(@PathVariable Long id) {
        return emailService.getEmail(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/email/{id}")
    public ResponseEntity<?> deleteEmail(@PathVariable Long id) {
        emailService.deleteEmail(id);
        return ResponseEntity.ok().build();
    }
}
