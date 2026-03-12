# MobileNotice

A self-hosted PWA push notification platform. External systems (PLCs, servers, scripts) send HTTP requests to trigger notification flows, which deliver real-time FCM push notifications to registered mobile/desktop users.

## Features

- **FCM Push Notifications** — foreground and background delivery via Firebase Cloud Messaging
- **Notification Flows** — configurable flows with `{{variable}}` templates, condition evaluation, rate limiting, and recipient targeting
- **Admin Dashboard** — send notifications, manage flows, view devices, issue API keys, change password
- **PWA** — installable on Android/iOS, works offline-capable
- **Docker + zrok** — fully containerized with automatic public HTTPS tunnel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | React 18, Vite, vite-plugin-pwa, Firebase Web SDK |
| Server | Express.js, better-sqlite3, Firebase Admin SDK, JWT |
| Infra | Docker Compose, nginx, zrok |

## Architecture

```
Internet
   │
   ▼
zrok tunnel (HTTPS)
   │
   ▼
nginx (client container)
   ├── /* → serves React PWA
   └── /api/* → proxy → Express server (internal only)
                              │
                              ▼
                         SQLite (volume)
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Firebase project](https://console.firebase.google.com/) with Cloud Messaging enabled
- [zrok account](https://zrok.io) (free tier available)

## Setup

### 1. Firebase

**Server (Admin SDK):**
1. Firebase Console → Project Settings → Service Accounts → Generate new private key
2. Note: `project_id`, `private_key`, `client_email`

**Client (Web SDK):**
1. Firebase Console → Project Settings → General → Web app → Firebase config
2. Project Settings → Cloud Messaging → Web Push certificates → Generate key pair (VAPID)

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env
# Fill in: JWT_SECRET, FIREBASE_*, ADMIN_USERNAME, ADMIN_PASSWORD

# Client
cp client/.env.example client/.env
# Fill in: VITE_FIREBASE_*

# Root (zrok)
cp .env.example .env
# Fill in: ZROK_ENABLE_TOKEN (from zrok.io Dashboard → Enable Environment)
```

### 3. First Run

```bash
docker compose up -d --build
docker compose logs -f zrok
# Wait for: https://xxxxxxxx.share.zrok.io
```

The zrok environment is enabled automatically on first start and persisted in a Docker volume. Subsequent restarts skip the enable step.

### 4. Access

| URL | Purpose |
|-----|---------|
| `https://<zrok-url>/register` | User device registration |
| `https://<zrok-url>/` | Notification inbox (PWA) |
| `https://<zrok-url>/admin/login` | Admin dashboard |

## Triggering Notifications from External Systems

### Create a Flow

1. Admin → 通知流程 → 新增流程
2. Set a `flow_key` (e.g. `machine_alarm`)
3. Define title/message templates using `{{variable}}` syntax

### Create an API Key

Admin → API Keys → 新增 → copy the key (shown once)

### Trigger via HTTP

```bash
# Trigger by flow key
curl -X POST https://<zrok-url>/api/flows/trigger/machine_alarm \
  -H "X-API-Key: sk_..." \
  -H "Content-Type: application/json" \
  -d '{"machine_id": "M-01", "error_code": "E42", "message": "Overheat"}'

# Trigger via generic webhook
curl -X POST https://<zrok-url>/api/flows/webhook \
  -H "X-API-Key: sk_..." \
  -H "Content-Type: application/json" \
  -d '{"flow_key": "machine_alarm", "machine_id": "M-01"}'
```

### Condition Evaluation

Flows can filter triggers using conditions:

```json
[
  { "field": "severity", "operator": "in", "value": ["high", "urgent"] },
  { "field": "temperature", "operator": "gt", "value": 80 }
]
```

Supported operators: `eq`, `neq`, `in`, `contains`, `gt`, `lt`

## Development (without Docker)

```bash
# Server
cd server && npm install && npm run dev

# Client (separate terminal)
cd client && npm install && npm run dev
```

Client dev server proxies `/api` to `http://localhost:3001`.

## Managing the Deployment

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Reset everything (including database)
docker compose down -v
```
