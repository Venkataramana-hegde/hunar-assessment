# Candidate Connect

A candidate communication platform for recruiters. It supports candidate management, individual and bulk messages, delivery status updates, failures, retries, and communication history.

## Tech stack

- Frontend: Next.js, React, TypeScript, Material UI
- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Provider: a separate FastAPI dummy communication service

```text
Next.js frontend → FastAPI backend → Dummy provider
                         ↑                 │
                         └──── webhook ────┘
```

## Run locally

Requirements: Python 3.12+, Node.js 20+, and pnpm 10+.

Open three terminals from the project directory.

### 1. Start the dummy provider

```bash
cd provider
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

### 2. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open <http://localhost:3000>. API documentation is available at <http://localhost:8000/docs>.

The backend creates the SQLite database and adds five demo candidates on its first start.

## Demo scenarios

The dummy provider decides the outcome from the recipient's phone number, so every
failure case can be demonstrated on demand.

| Candidate | Phone ends with | Result |
| --- | --- | --- |
| Rahul, Priya, Neha | anything else | Sent → Delivered → Read |
| Amit Kumar | `1234` | Temporary provider failure, retryable |
| Kavya Nair | `7777` | Rate limited, retryable |
| Rohan Mehta | `8888` | Delivery failed, permanent |
| any candidate | `0000` | Invalid recipient, permanent |

Stopping the provider service makes the next send fail as "communication service
unavailable" and flips the provider health indicator.

Select Rahul, Amit, Kavya, and Rohan together to see the bulk results screen show
one independent outcome per candidate.

## Tests and checks

```bash
cd backend
python -m pytest
```

```bash
cd frontend
pnpm format:check
pnpm build
```

## Project structure

- `frontend/app/` contains the pages.
- `frontend/components/` contains reusable UI components.
- `frontend/lib/api.ts` contains frontend API calls and shared response types.
- `backend/app/models.py` contains database models.
- `backend/app/schemas.py` contains request validation and response schemas.
- `backend/app/main.py` contains the API endpoints and messaging flow.
- `provider/app.py` contains the independent dummy provider.

## Deploy

Push the repository to GitHub, then create three services on a platform such as Railway using these root directories:

| Service | Root directory | Start command |
| --- | --- | --- |
| Frontend | `frontend` | `pnpm start` |
| Backend | `backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Provider | `provider` | `uvicorn app:app --host 0.0.0.0 --port $PORT` |

Use `pnpm build` as the frontend build command. Use `pip install -r requirements.txt` for both Python service build commands.

Set these backend variables:

```env
DATABASE_URL=sqlite:////data/app.db
PROVIDER_URL=https://YOUR_PROVIDER_DOMAIN
APP_BASE_URL=https://YOUR_BACKEND_DOMAIN
PROVIDER_WEBHOOK_SECRET=USE_A_RANDOM_SECRET
CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN
```

Set these variables on the other services:

```env
# Frontend
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN

# Provider
WEBHOOK_SECRET=USE_THE_SAME_RANDOM_SECRET
```

Attach persistent storage at `/data` to the backend so the SQLite database survives redeployments.

## Main decisions

- FastAPI is used because the assignment clarification allows Django or FastAPI.
- Every bulk recipient gets a separate message record, so one failure does not stop other messages.
- Duplicate webhook updates are safe and do not change an already-current status.
- Phone numbers use international format, such as `+919876543210`.
- Provider health and retryable failures are included as bonus features.
- The frontend polls every few seconds so webhook-driven status changes appear
  without a manual refresh.

## What is implemented

Core requirements:

- Candidate management with add, list, search, and detail views.
- Individual and bulk messaging, with each recipient tracked as its own message.
- Message statuses of Queued, Sent, Delivered, Read, and Failed.
- A separate dummy communication provider that returns reference IDs and sends
  status updates back by webhook.
- Webhook handling that is idempotent and ignores out-of-order updates.
- Failure handling for invalid recipients, temporary provider failures, rate
  limiting, delivery failures, and provider outages, each shown as a readable
  message rather than a technical error.
- Per-candidate communication history with timestamps, status, and failure reasons.
- Loading, empty, error, and in-progress states throughout the UI.
- A bulk results screen that reports the outcome for each candidate separately.

Bonus features:

- **Provider health** — a live operational indicator with sent, delivered, and
  failed counts.
- **Retry failed messages** — retries are offered only for failures the provider
  reports as temporary, and are refused for permanent ones.

Not implemented: message templates, scheduled messages, and multiple providers.

## Design

The Figma export belongs in `design/`. The core screens follow that design.
