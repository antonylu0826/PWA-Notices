# PWA Notices

A self-hosted PWA push notification platform. External systems (PLCs, servers, scripts) send HTTP requests to trigger notification flows, which deliver real-time FCM push notifications to registered mobile/desktop users.

## 🌟 Key Enhancements

- **One-Stop Environment Management** — All configurations are centralized in the root `.env` file, eliminating the need for multi-location maintenance.
- **Global Timezone Optimization (TZ)** — Automatically converts UTC time from the database to the user's local timezone (e.g., Taipei Time), supporting 24-hour format display.
- **Customizable Notification Branding** — Dynamically modify PWA installation names and notification banner sources via `VITE_APP_NAME`, resolving hardcoded name issues on iOS PWA.
- **Quick Install QR Code** — Built-in QR Code tab in the admin dashboard automatically detects the URL and generates a scan code for rapid PWA installation on mobile devices.
- **High Concurrency Stability** — Optimized Rate Limit settings to resolve 429 errors caused by frequent PWA refreshes.

## Features

- **FCM Push Notifications** — foreground and background delivery via Firebase Cloud Messaging. Optimized for iOS subtitle support.
- **Notification Flows** — configurable flows with `{{variable}}` templates, condition evaluation, rate limiting, and recipient targeting.
- **Admin Dashboard** — send notifications, manage flows, view devices, issue API keys, change password, and system health monitoring.
- **PWA** — installable on Android/iOS, works with dynamic manifest generation for custom branding.
- **Docker + zrok** — fully containerized with automatic public HTTPS tunnel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | React 18, Vite, i18next, qrcode.react, Firebase Web SDK |
| Server | Express.js, better-sqlite3, Firebase Admin SDK, JWT, express-rate-limit |
| Infra | Docker Compose, nginx (Security Headers + Proxy), zrok |

## Architecture

```
Internet
   │
   ▼
zrok tunnel (HTTPS)
   │
   ▼
nginx (client container) — [CSP / Security Headers]
   ├── /* → serves React PWA
   └── /api/* → proxy → Express server (internal only)
                               │
                               ▼
                          SQLite (volume)
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Firebase project](https://console.firebase.com/) with Cloud Messaging enabled
- [zrok account](https://zrok.io) (free tier available)

## Setup

### 1. Firebase Configuration

**Server (Admin SDK):**
1. Firebase Console → Project Settings → Service Accounts → Generate new private key.
2. Note: `project_id`, `private_key` (JSON string in .env), `client_email`.

**Client (Web SDK):
1. Firebase Console → Project Settings → General → Web app → Firebase config.
2. Project Settings → Cloud Messaging → Web Push certificates → Generate key pair (VAPID).

### 2. Configure Environment

Now all settings are unified in the root `.env`:

```bash
# Root directory
cp .env.example .env
# Fill in: 
# - VITE_APP_NAME: Your custom app name
# - TZ: Your timezone (e.g., Asia/Taipei)
# - ZROK_ENABLE_TOKEN: From zrok.io
# - FIREBASE_*: Backend/Frontend shared and private keys
```

### 3. Build & Deployment

```bash
# Rebuild and start everything
docker compose up -d --build

# Verify zrok URL
docker compose logs -f zrok
# Look for: https://xxxxxxxx.share.zrok.io
```

## Usage

### Public Access

| URL | Purpose |
|-----|---------|
| `https://<zrok-url>/register` | User device registration |
| `https://<zrok-url>/` | Notification inbox (PWA) |
| `https://<zrok-url>/admin/login` | Admin dashboard (Default: admin/admin123) |

### Trigger via API

```bash
# Example: Triggering a flow named 'test'
curl -X POST https://<zrok-url>/api/flows/trigger/test \
  -H "Authorization: sk_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## Timezone Support

The system stores all timestamps in **UTC** within the SQLite database. 
- **Backend**: Synchronized with the host via `TZ` environment variable in Docker.
- **Admin UI**: Automatically converts UTC strings to the user's browser local time with a standardized `YYYY/MM/DD HH:MM:SS` format.

## Deployment Commands

```bash
# Update and Restart
docker compose up -d --build

# View container logs
docker compose logs --tail=100 -f server

# Clean up (Keep DB)
docker compose down

# Full Reset (Wipe DB)
docker compose down -v
```
