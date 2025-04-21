package com.prabhat.tempmail.mail;

import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import com.prabhat.tempmail.model.Inbox;
import com.prabhat.tempmail.service.EmailService;
import com.prabhat.tempmail.service.InboxService;
import com.prabhat.tempmail.controller.InboxController;
import jakarta.annotation.PostConstruct;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Properties;
import java.util.UUID;

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
                        String toAddr = ((InternetAddress) msg.getAllRecipients()[0]).getAddress();
                        Optional<Inbox> optInbox = inboxService.findByEmail(toAddr);
                        if (optInbox.isPresent()) {
                            Inbox inbox = optInbox.get();
                            String sender = ((InternetAddress) msg.getFrom()[0]).getAddress();
                            String subject = msg.getSubject();
                            String content = msg.getContent().toString();
                            emailService.saveEmail(inbox.getId(), sender, subject, content);
                            inboxController.inboxEvent(inbox.getId(), "NEW_EMAIL");
                        }
                        greenMail.purgeEmailFromAllMailboxes();
                    }
                    Thread.sleep(2000); // poll interval
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }
}
