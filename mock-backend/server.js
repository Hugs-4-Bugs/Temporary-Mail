const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory database
const inboxes = {};
const emails = {};

// Generate a random email
const generateEmail = (domain = 'tempmail.org') => {
  const id = uuidv4().replace(/-/g, '');
  return `${id}@${domain}`;
};

// Get expiry time (10 minutes from now)
const getExpiryTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
};

// Create demo emails for a new inbox
const createDemoEmails = (inboxId) => {
  const welcomeEmail = {
    id: Date.now(),
    inboxId,
    from: 'welcome@temp-mail.org',
    subject: 'Welcome to Temporary Mail!',
    content: '<p>This is a demo welcome email.</p><p>Enjoy your stay ✨</p>',
    receivedAt: new Date().toISOString(),
    deleted: false
  };

  const otpEmail = {
    id: Date.now() + 1,
    inboxId,
    from: 'access@workos-mail.com',
    subject: 'Sign in to Million',
    content: `
      <p>You requested to sign in to Million. Your one-time code is:</p>
      <p><strong>797576</strong></p>
      <p>This code expires in 10 minutes. Email sent by WorkOS on behalf of Million.</p>
      <p>If you didn't request to sign in to Million, you can safely ignore this email. Someone else might have typed your email address by mistake.</p>
    `,
    receivedAt: new Date().toISOString(),
    otp: '797576',
    otpExpiresAt: getExpiryTime(),
    deleted: false
  };

  if (!emails[inboxId]) {
    emails[inboxId] = [];
  }
  emails[inboxId].push(welcomeEmail);
  emails[inboxId].push(otpEmail);

  return [welcomeEmail, otpEmail];
};

// Routes
// Create new inbox
app.post('/api/inbox', (req, res) => {
  const id = uuidv4();
  const emailAddress = generateEmail();
  const expiresAt = getExpiryTime();

  const inbox = {
    id,
    emailAddress,
    createdAt: new Date().toISOString(),
    expiresAt
  };

  inboxes[id] = inbox;
  createDemoEmails(id);

  console.log(`Created inbox: ${emailAddress}`);
  res.json(inbox);
});

// Get inbox by ID
app.get('/api/inbox/:uuid', (req, res) => {
  const { uuid } = req.params;
  const inbox = inboxes[uuid];

  if (!inbox) {
    return res.status(404).json({ message: 'Inbox not found' });
  }

  res.json(inbox);
});

// Change inbox address
app.post('/api/inbox/:uuid/change', (req, res) => {
  const { uuid } = req.params;
  const inbox = inboxes[uuid];

  if (!inbox) {
    return res.status(404).json({ message: 'Inbox not found' });
  }

  const newEmailAddress = generateEmail();
  inbox.emailAddress = newEmailAddress;
  inbox.expiresAt = getExpiryTime();

  // Clear emails for this inbox
  emails[uuid] = [];
  createDemoEmails(uuid);

  console.log(`Changed inbox address to: ${newEmailAddress}`);
  res.json(inbox);
});

// Refresh inbox
app.post('/api/inbox/:uuid/refresh', (req, res) => {
  const { uuid } = req.params;
  const inbox = inboxes[uuid];

  if (!inbox) {
    return res.status(404).json({ message: 'Inbox not found' });
  }

  res.json({ success: true });
});

// Get emails for inbox
app.get('/api/inbox/:uuid/emails', (req, res) => {
  const { uuid } = req.params;
  const inboxEmails = emails[uuid] || [];

  res.json(inboxEmails);
});

// Get email by ID
app.get('/api/email/:id', (req, res) => {
  const { id } = req.params;
  const emailId = parseInt(id, 10);

  // Find the email across all inboxes
  for (const inboxId in emails) {
    const found = emails[inboxId].find(email => email.id === emailId);
    if (found) {
      // Add 'to' field for display
      const email = {
        ...found,
        to: inboxes[inboxId].emailAddress
      };
      return res.json(email);
    }
  }

  res.status(404).json({ message: 'Email not found' });
});

// Delete email
app.delete('/api/email/:id', (req, res) => {
  const { id } = req.params;
  const emailId = parseInt(id, 10);

  // Find and mark the email as deleted
  for (const inboxId in emails) {
    const emailIndex = emails[inboxId].findIndex(email => email.id === emailId);
    if (emailIndex !== -1) {
      emails[inboxId][emailIndex].deleted = true;
      return res.json({ success: true });
    }
  }

  res.status(404).json({ message: 'Email not found' });
});

// SSE endpoint for real-time updates
app.get('/api/inbox/:uuid/stream', (req, res) => {
  const { uuid } = req.params;

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send an initial test message
  res.write('data: {"connected":true}\n\n');

  // Every 10 seconds, create a new email for demo purposes
  const interval = setInterval(() => {
    if (inboxes[uuid]) {
      const id = Date.now();
      const newEmail = {
        id,
        inboxId: uuid,
        from: `notifications-${Math.floor(Math.random() * 1000)}@tempmail.org`,
        subject: `New Notification ${new Date().toLocaleTimeString()}`,
        content: `<p>This is an auto-generated email at ${new Date().toLocaleTimeString()}</p>`,
        receivedAt: new Date().toISOString(),
        deleted: false
      };

      // Add to emails array
      if (!emails[uuid]) {
        emails[uuid] = [];
      }
      emails[uuid].push(newEmail);

      // Send SSE event
      res.write(`data: ${JSON.stringify(newEmail)}\n\n`);
      console.log(`Sent new email to inbox ${uuid}`);
    }
  }, 15000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log(`SSE connection closed for inbox ${uuid}`);
  });
});

// Check OTP status
app.get('/api/email/:id/otp-status', (req, res) => {
  const { id } = req.params;
  const emailId = parseInt(id, 10);

  // Find the email across all inboxes
  for (const inboxId in emails) {
    const found = emails[inboxId].find(email => email.id === emailId);
    if (found) {
      // Check if it contains an OTP
      if (found.otp) {
        // Check if OTP is expired
        const expired = found.otpExpiresAt
          ? new Date() > new Date(found.otpExpiresAt)
          : false;

        return res.json({
          hasOtp: true,
          otp: found.otp,
          expired,
          expiresAt: found.otpExpiresAt
        });
      }
      return res.json({ hasOtp: false });
    }
  }

  res.status(404).json({ message: 'Email not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock backend server running on http://localhost:${PORT}`);
});
