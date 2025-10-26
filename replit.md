# DialPax CRM Platform

## Overview
DialPax is a cloud-based dialer and CRM Single Page Application (SPA) designed to provide a comprehensive platform for managing communication and customer relationships. It integrates features for calls, SMS, contacts, recordings, and system settings, aiming to be a scalable, full-stack solution for businesses. The platform focuses on enhancing business communication, streamlining CRM processes, and offering a robust, secure, and user-friendly experience.

## Recent Changes
- **October 26, 2025**: Removed four features to streamline the platform: Scheduled Calls, Call Scripts, Call Dispositions, and Emails. This includes removal of all frontend pages, backend routes, database schemas, and related types/imports. The database schema references in the calls table and calendarEvents table have been cleaned up.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript.
-   **UI/UX**: Radix UI with shadcn/ui design system, Tailwind CSS for styling (CSS variables for theming), responsive (mobile-first), dark/light mode, accessibility features.
-   **State Management**: Zustand for global state, TanStack Query for server state.
-   **Form Handling**: React Hook Form with Zod validation.
-   **Build Tool**: Vite.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **API**: RESTful API with JSON responses.
-   **Session Management**: Express sessions with PostgreSQL store.

### Core Features
-   **Communication**: Dialer (keypad, call status), SMS (threaded), Recordings (management, playback, AI analytics, cost control), Voicemail.
-   **CRM**: Contacts (management, deduplication, phone normalization), Dashboard (statistics, activity), Call Management (mute, hold, notes, on-call UI).
-   **User & System Management**: Users (RBAC, 2FA, subscriptions), Support (ticketing, knowledge base), Profile settings.
-   **Incoming Calls**: Full-featured pop-up with caller info and WebRTC routing.
-   **System Settings**: Twilio integration, call settings, SMTP, Stripe, CDN.

### Design Patterns
-   User-specific `TwilioDeviceManager` for device lifecycle management.
-   Modern React Hook architecture.
-   Consistent branding with DialPax logos and color schemes.

### Security Implementation
-   **Authentication**: Auth0 (OAuth 2.0, JWT tokens - RS256), `express-jwt` middleware, hybrid session management.
-   **Authorization**: Role-based access control, strict tenant isolation (`userId` filtering).
-   **Twilio Webhook Security**: HMAC signature validation and user-scoped tokens.
-   **Data Encryption**: Per-user Twilio credentials encrypted (AES-256-GCM).
-   **Race Condition Prevention**: Active call checks for parallel dialer.
-   **TwiML Security**: Uses Twilio SDK's `VoiceResponse` class for TwiML generation to prevent injection vulnerabilities.

### Parallel Dialer Implementation
-   Utilizes `voiceUrl` webhooks with synchronous Answered Machine Detection (AMD) to connect customers to agents only after human detection. This ensures proper audio paths and handles machine/fax detection by hanging up. WebSockets are used for real-time status updates.
-   **Extended Call Status System**: Supports 14+ call status types, intelligently maps AMD outcomes, provides visual indicators, and includes extended WebSocket event data.
-   **Parallel Dialer Verification & Monitoring System**: Includes features for data integrity validation, AMD performance monitoring, disposition accuracy validation, single-call enforcement verification, resource leak detection, and comprehensive analytics. API endpoints and a dedicated dashboard are available for monitoring.

### Recording Storage with BunnyCDN
-   Automated workflow uploads recordings to BunnyCDN immediately after a call ends and deletes them from Twilio to reduce storage costs.
-   **Implementation**: Database schema tracks migration status. `bunnycdnService` handles uploads (with retries and exponential backoff) and deletions.
-   **Security**: Uses environment variables for credentials and supports token-based authentication with MD5 hashing for secure CDN access via signed URLs (requires `BUNNYCDN_TOKEN_AUTH_KEY`).
-   **Playback Architecture**: Server-proxied playback/download (`/api/recordings/:id/play` and `/api/recordings/:id/download`) ensures secure access without exposing CDN URLs directly to the frontend.

## External Dependencies

-   **Database**: PostgreSQL, Neon Database.
-   **ORM**: Drizzle ORM.
-   **UI Components**: Radix UI, shadcn/ui, Lucide React.
-   **Styling**: Tailwind CSS.
-   **Date Handling**: date-fns.
-   **Payment Processing**: Stripe.
-   **Voice & SMS**: Twilio (Voice SDK, TwiML, API).
-   **Authentication**: Auth0.
-   **CDN Storage**: BunnyCDN.
-   **Utilities**: `libphonenumber-js`.