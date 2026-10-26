import os
from contextlib import asynccontextmanager
import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .database import Base, engine, get_db, SessionLocal
from .models import Candidate, Message
from .schemas import (
    CandidateCreate,
    CandidateOut,
    MessageCreate,
    MessageOut,
    MessageWithCandidate,
    WebhookUpdate,
)

def public_url(name: str, default: str) -> str:
    """Read a service URL, tolerating the forms hosting platforms hand out.

    Render exposes another service's address as a bare host name, and trailing
    slashes are easy to paste in by mistake. Both break the HTTP client, so the
    scheme is added when missing and the trailing slash is removed.
    """
    value = (os.getenv(name) or "").strip().rstrip("/") or default
    if "://" not in value:
        value = f"https://{value}"
    return value


PROVIDER_URL = public_url("PROVIDER_URL", "http://localhost:8001")
APP_BASE_URL = public_url("APP_BASE_URL", "http://localhost:8000")
WEBHOOK_SECRET = os.getenv("PROVIDER_WEBHOOK_SECRET", "local-webhook-secret")
SEND_TIMEOUT = float(os.getenv("PROVIDER_SEND_TIMEOUT", "30"))
HEALTH_TIMEOUT = float(os.getenv("PROVIDER_HEALTH_TIMEOUT", "10"))
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in (os.getenv("CORS_ORIGINS") or "http://localhost:3000").split(",")
    if origin.strip()
]
VALID_TRANSITIONS = {
    "queued": {"sent", "failed"},
    "sent": {"delivered", "failed"},
    "delivered": {"read", "failed"},
    "read": set(),
    "failed": set(),
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(func.count()).select_from(Candidate)):
            db.add_all(
                [
                    Candidate(name="Rahul Sharma", email="rahul@example.com", phone="+919876543210"),
                    Candidate(name="Priya Shah", email="priya@example.com", phone="+919812345678"),
                    Candidate(name="Amit Kumar", email="amit@example.com", phone="+919700001234"),
                    Candidate(name="Neha Patel", email="neha@example.com", phone="+919988776655"),
                    Candidate(name="Rohan Mehta", email="rohan@example.com", phone="+919600008888"),
                    Candidate(name="Kavya Nair", email="kavya@example.com", phone="+919555557777"),
                    Candidate(name="Vikram Rao", email="vikram@example.com", phone="+919400000000"),
                ]
            )
            db.commit()
    yield

app = FastAPI(title="Candidate Communication API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "operational"}

@app.get("/api/candidates", response_model=list[CandidateOut])
def candidates(search: str = Query("", max_length=100), db: Session = Depends(get_db)):
    stmt = select(Candidate).order_by(Candidate.created_at.desc())
    if search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Candidate.name.ilike(term),
                Candidate.email.ilike(term),
                Candidate.phone.ilike(term),
            )
        )
    return db.scalars(stmt).all()

@app.post("/api/candidates", response_model=CandidateOut, status_code=201)
def add_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
    candidate = Candidate(**payload.model_dump())
    db.add(candidate)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "A candidate with this email or phone already exists"
        )
    db.refresh(candidate)
    return candidate

@app.get("/api/candidates/{candidate_id}", response_model=CandidateOut)
def candidate(candidate_id: int, db: Session = Depends(get_db)):
    value = db.get(Candidate, candidate_id)
    if not value:
        raise HTTPException(404, "Candidate not found")
    return value

@app.get("/api/candidates/{candidate_id}/messages", response_model=list[MessageOut])
def history(candidate_id: int, db: Session = Depends(get_db)):
    if not db.get(Candidate, candidate_id):
        raise HTTPException(404, "Candidate not found")

    query = (
        select(Message)
        .where(Message.candidate_id == candidate_id)
        .order_by(Message.created_at.desc())
    )
    return db.scalars(query).all()

async def dispatch(message_id: int):
    with SessionLocal() as db:
        message = db.get(Message, message_id)
        if not message:
            return

        message.attempts += 1
        db.commit()
        payload = {
            "to": message.candidate.phone,
            "body": message.body,
            "callback_url": f"{APP_BASE_URL}/api/webhooks/provider",
        }
        try:
            # Hosted providers on free tiers can take 20 seconds or more to
            # wake from idle, so the send timeout is generous. A genuine
            # timeout is still reported as a retryable failure.
            async with httpx.AsyncClient(timeout=SEND_TIMEOUT) as client:
                response = await client.post(f"{PROVIDER_URL}/messages", json=payload)
            if response.is_success:
                provider_message = response.json()
                message.provider_id = provider_message["id"]
                message.status = provider_message["status"]
                message.error_code = None
                message.error_message = None
                message.retryable = False
            else:
                try:
                    detail = response.json().get("detail", {})
                except ValueError:
                    detail = {}
                if not isinstance(detail, dict):
                    detail = {}
                message.status = "failed"
                message.error_code = detail.get("code", "provider_error")
                message.error_message = detail.get(
                    "message",
                    "The communication provider could not accept the message.",
                )
                message.retryable = response.status_code in (429, 502, 503, 504)
        except httpx.HTTPError:
            message.status = "failed"
            message.error_code = "provider_unavailable"
            message.error_message = (
                "The communication service is unavailable. Please retry shortly."
            )
            message.retryable = True
        db.commit()

@app.post("/api/messages", response_model=list[MessageOut], status_code=202)
def send(payload: MessageCreate, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ids = list(dict.fromkeys(payload.candidate_ids))
    found = set(db.scalars(select(Candidate.id).where(Candidate.id.in_(ids))).all())
    missing = [i for i in ids if i not in found]
    if missing:
        raise HTTPException(404, f"Candidates not found: {missing}")
    messages = [Message(candidate_id=i, body=payload.body) for i in ids]
    db.add_all(messages)
    db.commit()

    for message in messages:
        db.refresh(message)
        tasks.add_task(dispatch, message.id)
    return messages

@app.get("/api/messages", response_model=list[MessageWithCandidate])
def messages(db: Session = Depends(get_db)):
    query = (
        select(Message)
        .options(joinedload(Message.candidate))
        .order_by(Message.created_at.desc())
        .limit(100)
    )
    return db.scalars(query).all()

@app.post("/api/messages/{message_id}/retry", response_model=MessageOut, status_code=202)
def retry(message_id: int, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    message = db.get(Message, message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    if message.status != "failed" or not message.retryable:
        raise HTTPException(409, "This message cannot be retried")

    message.status = "queued"
    message.provider_id = None
    db.commit()
    db.refresh(message)
    tasks.add_task(dispatch, message.id)
    return message

@app.post("/api/webhooks/provider", status_code=204)
def webhook(
    payload: WebhookUpdate,
    x_webhook_secret: str | None = Header(None),
    db: Session = Depends(get_db),
):
    if x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(401, "Invalid webhook signature")
    message = db.scalar(select(Message).where(Message.provider_id == payload.provider_id))
    if not message:
        raise HTTPException(404, "Message not found")

    # Providers may send the same event more than once. Returning without changing
    # the record makes duplicate webhook calls safe (idempotent).
    if payload.status == message.status:
        return
    if payload.status not in VALID_TRANSITIONS.get(message.status, set()):
        return

    message.status = payload.status
    message.error_code = payload.error_code
    message.error_message = payload.error_message
    message.retryable = payload.retryable
    db.commit()

@app.get("/api/provider-health")
async def provider_health(db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=HEALTH_TIMEOUT) as client:
            response = await client.get(f"{PROVIDER_URL}/health")
        operational = response.is_success
    except httpx.HTTPError:
        operational = False

    count_query = select(Message.status, func.count(Message.id)).group_by(
        Message.status
    )
    counts = dict(db.execute(count_query).all())
    return {
        "operational": operational,
        "total": sum(counts.values()),
        "delivered": counts.get("delivered", 0) + counts.get("read", 0),
        "failed": counts.get("failed", 0),
    }

