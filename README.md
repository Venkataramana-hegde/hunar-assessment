# Candidate Connect

A candidate communication platform for recruiters. It supports candidate management, individual and bulk messages, delivery status updates, failures, retries, and communication history.

## Live demo

| | |
| --- | --- |
| Application | <https://hunar-assessment.vercel.app> |
| Backend API | <https://candidate-comms-api.onrender.com/docs> |
| Dummy provider | <https://candidate-comms-provider.onrender.com/health> |

> **Please allow up to a minute on first load.** The backend and the dummy
> provider run on Render's free tier, which suspends a service after about
> fifteen minutes of inactivity. The first request after a quiet period wakes
> them, which can take twenty to sixty seconds, and the provider health panel
> may briefly read "unavailable" while that happens. Everything is immediate
> once both services are awake. Opening the two service links above first is
> the quickest way to warm them.

## Tech stack

- Frontend: Next.js, React, TypeScript, Material UI
- Backend: Python, FastAPI, SQLAlchemy, SQLite locally and Postgres (Neon) when deployed
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

### Configuration

Each service reads its own `.env` file, and every setting has a working local
default, so no configuration is needed to run the project locally. To change
something, copy the example beside it:

```bash
cp backend/.env.example backend/.env
cp provider/.env.example provider/.env
cp frontend/.env.example frontend/.env
```

`backend/.env.example` documents every backend setting, including the Postgres
connection string and the provider timeouts.

The backend creates the SQLite database and adds five demo candidates on its first start.

## Demo scenarios

The dummy provider decides the outcome from the recipient's phone number, so every
failure case can be demonstrated on demand.

| Candidate | Phone number ends with | What the recruiter sees |
| --- | --- | --- |
| Rahul Sharma, Priya Shah, Neha Patel | any other digits | Sent, then Delivered, then Read |
| Amit Kumar | `1234` | Temporary provider failure, can be retried |
| Kavya Nair | `7777` | Rate limited, can be retried |
| Rohan Mehta | `8888` | Delivery failed, permanent |
| Vikram Rao | `0000` | Invalid recipient, permanent |

A sixth case, "communication service unavailable", happens whenever the provider
cannot be reached: stop the provider locally, or send while it is suspended on a
free tier. The provider health indicator turns red at the same time.

Selecting Rahul, Amit, Kavya, and Rohan together is the quickest way to see the
bulk results screen report a different outcome for each candidate.

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
- `backend/app/main.py` contains the API endpoints, templating and messaging flow.
- `provider/app.py` contains the independent dummy provider.

## Deploy

The deployment uses Vercel for the frontend, Render for the two Python services,
and Neon for Postgres.

[render.yaml](render.yaml) describes both Python services, so Render's Blueprint
flow creates them together and wires `PROVIDER_URL` and `APP_BASE_URL` between
them automatically.

### Render, backend and provider

Create a Blueprint from this repository and supply the values that are not in
the file:

```env
# candidate-comms-api
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
PROVIDER_WEBHOOK_SECRET=USE_A_RANDOM_SECRET
CORS_ORIGINS=https://YOUR_FRONTEND_DOMAIN

# candidate-comms-provider
WEBHOOK_SECRET=USE_THE_SAME_RANDOM_SECRET
```

Creating the services by hand works too, with root directories `backend` and
`provider`, `pip install -r requirements.txt` to build, and
`uvicorn app.main:app --host 0.0.0.0 --port $PORT` and
`uvicorn app:app --host 0.0.0.0 --port $PORT` to start. Set `PROVIDER_URL` and
`APP_BASE_URL` yourself in that case.

`APP_BASE_URL` must be the backend's own public URL, because the provider sends
status updates back to it. `PROVIDER_WEBHOOK_SECRET` and `WEBHOOK_SECRET` must
hold the same value, or every status update is rejected.

### Vercel, frontend

Import the repository with root directory `frontend` and set:

```env
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN
```

Next.js reads this at build time, so changing it later needs a new deployment.

### Database

The backend runs on SQLite by default, which keeps local setup to zero steps. Any
Postgres URL works instead, including serverless providers such as Neon: set
`DATABASE_URL` to the connection string and the tables are created on first start.
`postgres://` and `postgresql://` URLs are normalised onto psycopg automatically.

Postgres is the better choice for a deployment, because it needs no persistent
volume and tolerates more than one backend instance. To stay on SQLite instead,
set `DATABASE_URL=sqlite:////data/app.db` and attach persistent storage at `/data`,
or the database is lost on every redeployment.

## Main decisions

- FastAPI is used because the assignment clarification allows Django or FastAPI.
- SQLAlchemy keeps the data layer database-agnostic, so the same code runs on
  SQLite locally and on hosted Postgres in a deployment.
- Every bulk recipient gets a separate message record, so one failure does not stop other messages.
- Duplicate webhook updates are safe and do not change an already-current status.
- Phone numbers use international format, such as `+919876543210`.
- Provider health and retryable failures are included as bonus features.
- Database hosts publish both IPv4 and IPv6 addresses while many container
  platforms have no IPv6 route, so Postgres connections are pinned to IPv4.
- Provider timeouts are generous, because a suspended service can take twenty
  seconds or more to wake. `PROVIDER_SEND_TIMEOUT` and `PROVIDER_HEALTH_TIMEOUT`
  override them.
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

- **Message templates** — reusable messages managed on their own page, with
  `{{name}}`, `{{first_name}}`, `{{email}}` and `{{phone}}` placeholders. The
  backend renders the body separately for each recipient, so a bulk send gives
  every candidate their own personalised message, and that is what is stored in
  the history. The compose dialog previews the result before sending.
- **Provider health** — a live operational indicator with sent, delivered, and
  failed counts.
- **Retry failed messages** — retries are offered only for failures the provider
  reports as temporary, and are refused for permanent ones.

Not implemented: scheduled messages and multiple communication providers.

## Design

The Figma file is in `design/`. The core screens follow it.
