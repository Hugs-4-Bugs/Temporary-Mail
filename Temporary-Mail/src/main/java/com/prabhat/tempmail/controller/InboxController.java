package com.prabhat.tempmail.controller;

import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.service.InboxService;
import com.prabhat.tempmail.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/inbox")
@RequiredArgsConstructor
public class InboxController {
    private final InboxService inboxService;
    private final EmailService emailService;

    // Simple per-inbox emitter storage (not prod-ready)
    private final ConcurrentHashMap<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<Inbox> createInbox() {
        Inbox inbox = inboxService.createInbox();
        return ResponseEntity.ok(inbox);
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<Inbox> getInbox(@PathVariable UUID uuid) {
        return inboxService.getInbox(uuid)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{uuid}/change")
    public ResponseEntity<Inbox> changeInbox(@PathVariable UUID uuid) {
        Inbox inbox = inboxService.changeInboxAddress(uuid);
        if (inbox == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(inbox);
    }

    @PostMapping("/{uuid}/refresh")
    public ResponseEntity<?> refreshInbox(@PathVariable UUID uuid) {
        // No real refresh, but could trigger client-side update
        return ResponseEntity.ok().build();
    }

    // SSE endpoint for real-time inbox events
    @GetMapping("/{uuid}/stream")
    public SseEmitter streamInbox(@PathVariable UUID uuid) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitters.put(uuid, emitter);
        emitter.onCompletion(() -> emitters.remove(uuid));
        emitter.onTimeout(() -> emitters.remove(uuid));
        return emitter;
    }

    // Utility to push event (to be called from Email receiving code)
    public void inboxEvent(UUID inboxId, Object data) {
        SseEmitter emitter = emitters.get(inboxId);
        if (emitter != null) {
            try {
                emitter.send(data);
            } catch (Exception e) {
                emitters.remove(inboxId);
            }
        }
    }
}
