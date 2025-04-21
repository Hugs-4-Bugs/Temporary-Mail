package com.prabhat.tempmail.mail;

import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import com.prabhat.tempmail.model.Email;
import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.service.EmailService;
import com.prabhat.tempmail.service.InboxService;
import com.prabhat.tempmail.controller.InboxController;
import jakarta.annotation.PostConstruct;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
public class GreenMailListener {
    private final GreenMail greenMail;
    private final InboxService inboxService;
    private final EmailService emailService;
    private final InboxController inboxController;

    public GreenMailListener(InboxService inboxService, EmailService emailService, InboxController inboxController,
                             @Value("${greenmail.smtp.port:3025}") int smtpPort,
                             @Value("${greenmail.hostname:localhost}") String hostname) {
        this.greenMail = new GreenMail(new ServerSetup(smtpPort, hostname, ServerSetup.PROTOCOL_SMTP));
        this.inboxService = inboxService;
        this.emailService = emailService;
        this.inboxController = inboxController;
    }

    @PostConstruct
    public void startServer() {
        greenMail.start();
        new Thread(() -> {
            try {
                while (true) {
                    MimeMessage[] messages = greenMail.getReceivedMessages();
                    for (MimeMessage msg : messages) {
                        try {
                            processEmail(msg);
                        } catch (Exception e) {
                            System.err.println("Error processing email: " + e.getMessage());
                            e.printStackTrace();
                        }
                    }
                    greenMail.purgeEmailFromAllMailboxes();
                    Thread.sleep(2000); // poll interval
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void processEmail(MimeMessage message) throws MessagingException, IOException {
        Address[] recipients = message.getAllRecipients();
        if (recipients == null || recipients.length == 0) {
            return;
        }

        String toAddr = ((InternetAddress) recipients[0]).getAddress();
        Optional<Inbox> optInbox = inboxService.findByEmail(toAddr);

        if (optInbox.isPresent()) {
            Inbox inbox = optInbox.get();
            String sender = getSender(message);
            String subject = message.getSubject() != null ? message.getSubject() : "(No Subject)";
            String content = getEmailContent(message);

            // Create and save the email
            Email savedEmail = emailService.saveEmail(inbox.getId(), sender, subject, content);

            // Notify any connected clients about the new email
            inboxController.inboxEvent(inbox.getId(), savedEmail);
        }
    }

    private String getSender(MimeMessage message) throws MessagingException {
        Address[] fromAddresses = message.getFrom();
        if (fromAddresses != null && fromAddresses.length > 0) {
            return ((InternetAddress) fromAddresses[0]).getAddress();
        }
        return "unknown@sender.com";
    }

    private String getEmailContent(MimeMessage message) throws MessagingException, IOException {
        Object content = message.getContent();

        if (content instanceof String) {
            return (String) content;
        } else if (content instanceof MimeMultipart) {
            return getTextFromMimeMultipart((MimeMultipart) content);
        }

        return "Unable to extract content";
    }

    private String getTextFromMimeMultipart(MimeMultipart mimeMultipart) throws MessagingException, IOException {
        StringBuilder result = new StringBuilder();
        int count = mimeMultipart.getCount();

        for (int i = 0; i < count; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);

            if (bodyPart.isMimeType("text/html")) {
                // Prefer HTML content
                return (String) bodyPart.getContent();
            } else if (bodyPart.isMimeType("text/plain")) {
                result.append((String) bodyPart.getContent());
            } else if (bodyPart.getContent() instanceof MimeMultipart) {
                result.append(getTextFromMimeMultipart((MimeMultipart) bodyPart.getContent()));
            }
        }

        return result.toString();
    }
}
