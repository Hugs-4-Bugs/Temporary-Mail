const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;

// Middleware
// Enhanced CORS configuration to allow all origins during development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// In-memory database
const inboxes = {};
const emails = {};

// Root API endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Temporary Mail API - Use /api endpoints for service functionality',
    status: 'online',
    endpoints: {
      createInbox: 'POST /api/inbox',
      getInbox: 'GET /api/inbox/:uuid',
      changeInbox: 'POST /api/inbox/:uuid/change',
      refreshInbox: 'POST /api/inbox/:uuid/refresh',
      getEmails: 'GET /api/inbox/:uuid/emails',
      getEmail: 'GET /api/email/:id',
      deleteEmail: 'DELETE /api/email/:id',
      streamUpdates: 'GET /api/inbox/:uuid/stream',
      otpStatus: 'GET /api/email/:id/otp-status'
    }
  });
});

// Generate a random email
const generateEmail = (domain = 'tempmail.org') => {
  const id = uuidv4().replace(/-/g, '').substring(0, 10);
  return `${id}@${domain}`;
};

// Generate OTP
const generateOtp = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
};

// Get expiry time (10 minutes from now)
const getExpiryTime = (minutes = 10) => {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
};

// Format time string nicely
const formatTimeString = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Different OTP templates
const otpTemplates = [
  {
    name: 'WorkOS',
    from: 'access@workos-mail.com',
    subject: 'Sign in to Million',
    contentBuilder: (otp, expiresAt) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; margin-bottom: 24px;">Sign in to Million</h2>
        <p>You requested to sign in to Million. Your one-time code is:</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 24px 0;">
          ${otp}
        </div>
        <p style="margin-bottom: 24px;">This code expires at ${formatTimeString(expiresAt)}.</p>
        <p style="color: #666; font-size: 14px;">Email sent by WorkOS on behalf of Million.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request to sign in to Million, you can safely ignore this email.</p>
      </div>
    `
  },
  {
    name: 'Stripe',
    from: 'verify@stripe.com',
    subject: 'Stripe verification code',
    contentBuilder: (otp, expiresAt) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 24px 0;">
          <img src="https://same-assets.com/stripe-logo.png" alt="Stripe" width="120" style="margin-bottom: 24px;">
          <h2 style="color: #32325d; margin-bottom: 18px;">Your Stripe verification code</h2>
          <p style="margin-bottom: 24px; color: #525f7f;">This code will expire in 10 minutes.</p>
          <div style="background-color: #f6f9fc; border: 1px solid #e3e8ee; border-radius: 4px; padding: 16px; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 24px 0; text-align: center;">
            ${otp}
          </div>
          <p style="color: #525f7f; margin-bottom: 24px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
        <div style="border-top: 1px solid #e3e8ee; padding-top: 16px; font-size: 12px; color: #8898aa;">
          <p>Stripe, 510 Townsend Street, San Francisco, CA 94103</p>
        </div>
      </div>
    `
  },
  {
    name: 'Google',
    from: 'no-reply@accounts.google.com',
    subject: 'Your Google verification code',
    contentBuilder: (otp, expiresAt) => `
      <div style="font-family: 'Google Sans', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 24px 0;">
          <img src="https://same-assets.com/google-logo.png" alt="Google" width="100" style="margin-bottom: 24px;">
          <h2 style="color: #202124; margin-bottom: 18px; font-weight: 400;">Verification code</h2>
          <p style="margin-bottom: 24px; color: #5f6368;">Your verification code is:</p>
          <div style="font-size: 24px; color: #202124; margin: 24px 0;">
            <strong>${otp}</strong>
          </div>
          <p style="color: #5f6368;">This code will expire in 10 minutes.</p>
          <p style="color: #5f6368; margin-top: 24px;">If you didn't request this code, someone might be trying to access your account.</p>
          <p style="color: #5f6368;">The Google Accounts team</p>
        </div>
      </div>
    `
  },
  {
    name: 'GitHub',
    from: 'noreply@github.com',
    subject: 'Sign in code: 123456',
    contentBuilder: (otp, expiresAt) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 24px 0;">
          <img src="https://same-assets.com/github-logo.png" alt="GitHub" width="32" style="margin-bottom: 24px;">
          <h2 style="color: #24292e; margin-bottom: 18px;">Your one-time code: ${otp}</h2>
          <p style="margin-bottom: 24px; color: #586069;">
            We received a request to sign in to GitHub.com using this email address. Enter this code to complete your sign in.
          </p>
          <p style="color: #586069; margin-top: 24px;">
            If you don't recognize this activity, change your GitHub.com password and enable two-factor authentication. <a href="#" style="color: #0366d6;">Learn more</a>
          </p>
          <p style="color: #586069; margin-top: 24px;">
            Expires at ${formatTimeString(expiresAt)}.
          </p>
          <div style="margin-top: 48px; color: #6a737d; font-size: 12px;">
            <p>You're receiving this email because a sign-in attempt requires additional confirmation.</p>
          </div>
        </div>
      </div>
    `
  }
];

// Create demo emails for a new inbox
const createDemoEmails = (inboxId) => {
  const welcomeEmail = {
    id: Date.now(),
    inboxId,
    from: 'welcome@temp-mail.org',
    subject: 'Welcome to Temporary Mail!',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #3b82f6; margin-bottom: 16px;">Welcome to Temporary Mail!</h2>
        <p>This is your private temporary inbox. You can use this email address to sign up for services without using your personal email.</p>

        <h3 style="margin-top: 24px; margin-bottom: 12px;">How it works:</h3>
        <ul>
          <li>Any emails sent to this address will appear in your inbox automatically.</li>
          <li>Your temporary email address will expire in 10 minutes.</li>
          <li>Click "Change Address" to generate a new temporary email address.</li>
          <li>Click "Refresh Inbox" to check for new emails.</li>
        </ul>

        <p style="margin-top: 24px;">Enjoy your temporary email service! ✨</p>
      </div>
    `,
    receivedAt: new Date().toISOString(),
    deleted: false
  };

  // Select a random OTP template
  const template = otpTemplates[Math.floor(Math.random() * otpTemplates.length)];
  const otp = generateOtp();
  const expiryTime = getExpiryTime();

  const otpEmail = {
    id: Date.now() + 1,
    inboxId,
    from: template.from,
    subject: template.subject.replace('123456', otp), // In case the subject contains the OTP
    content: template.contentBuilder(otp, expiryTime),
    receivedAt: new Date().toISOString(),
    otp: otp,
    otpExpiresAt: expiryTime,
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

  // Add a new OTP email occasionally on refresh
  if (Math.random() > 0.5) {
    const template = otpTemplates[Math.floor(Math.random() * otpTemplates.length)];
    const otp = generateOtp();
    const expiryTime = getExpiryTime(Math.floor(Math.random() * 15) + 5); // 5-20 minutes

    const newEmail = {
      id: Date.now(),
      inboxId: uuid,
      from: template.from,
      subject: template.subject.replace('123456', otp),
      content: template.contentBuilder(otp, expiryTime),
      receivedAt: new Date().toISOString(),
      otp: otp,
      otpExpiresAt: expiryTime,
      deleted: false
    };

    if (!emails[uuid]) {
      emails[uuid] = [];
    }
    emails[uuid].push(newEmail);
    console.log(`Added new OTP email to inbox ${uuid}`);
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

  // Every 10-20 seconds, create a new email for demo purposes
  const interval = setInterval(() => {
    if (inboxes[uuid]) {
      // Randomly choose between a regular notification and an OTP email
      const isOtpEmail = Math.random() > 0.7;
      const id = Date.now();

      let newEmail;

      if (isOtpEmail) {
        // Create an OTP email
        const template = otpTemplates[Math.floor(Math.random() * otpTemplates.length)];
        const otp = generateOtp();
        const expiryTime = getExpiryTime(Math.floor(Math.random() * 15) + 5); // 5-20 minutes

        newEmail = {
          id,
          inboxId: uuid,
          from: template.from,
          subject: template.subject.replace('123456', otp),
          content: template.contentBuilder(otp, expiryTime),
          receivedAt: new Date().toISOString(),
          otp: otp,
          otpExpiresAt: expiryTime,
          deleted: false
        };
      } else {
        // Create a regular notification email
        newEmail = {
          id,
          inboxId: uuid,
          from: `notifications-${Math.floor(Math.random() * 1000)}@tempmail.org`,
          subject: `New Notification ${new Date().toLocaleTimeString()}`,
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #3b82f6; margin-bottom: 16px;">New Notification</h2>
              <p>This is an auto-generated notification email at ${new Date().toLocaleTimeString()}</p>
              <p>Your temporary email account is working properly!</p>
            </div>
          `,
          receivedAt: new Date().toISOString(),
          deleted: false
        };
      }

      // Add to emails array
      if (!emails[uuid]) {
        emails[uuid] = [];
      }
      emails[uuid].push(newEmail);

      // Send SSE event
      res.write(`data: ${JSON.stringify(newEmail)}\n\n`);
      console.log(`Sent new ${isOtpEmail ? 'OTP' : 'notification'} email to inbox ${uuid}`);
    }
  }, Math.floor(Math.random() * 10000) + 15000); // 15-25 seconds

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
