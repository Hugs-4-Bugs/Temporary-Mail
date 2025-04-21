# Temp Mail Backend

This is the backend for a temporary email service, built using Spring Boot, PostgreSQL, and GreenMail (for mock SMTP).

## Features
- Generates random temporary email addresses such as `<uuid>@prabhat.temp`
- Receives/send/parse incoming emails (via GreenMail SMTP)
- Stores inbox and email data to PostgreSQL
- REST API for managing inboxes/messages
- Server-Sent Events (SSE) for real-time inbox updates
- Scheduled auto-expiry of inboxes/messages

## Project Structure
- `src/main/java/com/prabhat/tempmail/` — Source code
- `src/main/resources/` — Configuration
- `pom.xml` — Maven build/deps

## Dev
Build/run with Docker Compose, or import with Maven into your IDE.
