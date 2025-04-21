package com.prabhat.tempmail.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emails")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Email {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "uuid")
    private UUID inboxId;

    @Column(nullable = false)
    private String sender;

    @Column
    private String recipient;

    @Column(nullable = false)
    private String subject;

    @Lob
    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private Instant receivedAt;

    @Column
    private String otp;

    @Column
    private Instant otpExpiresAt;

    @Column(nullable = false)
    private boolean deleted = false;

    @Transient
    public boolean isOtpExpired() {
        if (otpExpiresAt == null) return true;
        return Instant.now().isAfter(otpExpiresAt);
    }

    @Transient
    public String getFrom() {
        return sender;
    }

    @Transient
    public String getTo() {
        return recipient;
    }
}
