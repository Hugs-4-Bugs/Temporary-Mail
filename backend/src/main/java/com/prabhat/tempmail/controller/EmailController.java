package com.prabhat.tempmail.controller;

import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    @GetMapping("/email/{id}/otp-status")
    public ResponseEntity<Map<String, Object>> checkOtpStatus(@PathVariable Long id) {
        return emailService.getEmail(id)
                .map(email -> {
                    Map<String, Object> response = new HashMap<>();
                    String otp = email.getOtp();
                    boolean hasOtp = otp != null && !otp.isEmpty();

                    response.put("hasOtp", hasOtp);
                    if (hasOtp) {
                        response.put("otp", otp);
                        response.put("expired", email.isOtpExpired());
                    }

                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/inbox/{uuid}/emails")
    public ResponseEntity<?> deleteAllEmails(@PathVariable UUID uuid) {
        emailService.deleteEmailsByInbox(uuid);
        return ResponseEntity.ok().build();
    }
}
