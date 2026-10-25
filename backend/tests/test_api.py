import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
from fastapi.testclient import TestClient
from app.main import app

def test_candidate_validation_and_duplicate():
    with TestClient(app) as client:
        bad = client.post("/api/candidates", json={"name":"A","email":"bad","phone":"123"})
        assert bad.status_code == 422
        payload = {"name":"Test Candidate","email":"unique-test@example.com","phone":"+919111111111"}
        first = client.post("/api/candidates", json=payload)
        assert first.status_code in (201, 409)
        assert client.post("/api/candidates", json=payload).status_code == 409

def test_bulk_rejects_unknown_candidate_without_partial_records():
    with TestClient(app) as client:
        before = len(client.get("/api/messages").json())
        response = client.post("/api/messages", json={"candidate_ids":[1,999999],"body":"Interview tomorrow"})
        assert response.status_code == 404
        assert len(client.get("/api/messages").json()) == before

def test_webhook_requires_secret():
    with TestClient(app) as client:
        response = client.post("/api/webhooks/provider", json={"provider_id":"unknown","status":"delivered"})
        assert response.status_code == 401



def test_duplicate_and_out_of_order_webhooks_are_safe():
    with TestClient(app) as client:
        client.post("/api/messages", json={"candidate_ids": [1], "body": "Hello"})
        message = client.get("/api/messages").json()[0]
        provider_id = "msg_webhook_test"
        # Give the message a known provider id by simulating a successful send.
        from app.database import SessionLocal
        from app.models import Message
        with SessionLocal() as db:
            record = db.get(Message, message["id"])
            record.provider_id = provider_id
            record.status = "sent"
            db.commit()

        headers = {"x-webhook-secret": "local-webhook-secret"}
        body = {"provider_id": provider_id, "status": "delivered"}
        assert client.post("/api/webhooks/provider", json=body, headers=headers).status_code == 204
        # The same event again must not change anything.
        assert client.post("/api/webhooks/provider", json=body, headers=headers).status_code == 204
        # A status that moves backwards is ignored.
        client.post(
            "/api/webhooks/provider",
            json={"provider_id": provider_id, "status": "sent"},
            headers=headers,
        )
        current = [m for m in client.get("/api/messages").json() if m["id"] == message["id"]][0]
        assert current["status"] == "delivered"


def test_permanent_failures_cannot_be_retried():
    with TestClient(app) as client:
        client.post("/api/messages", json={"candidate_ids": [1], "body": "Retry rules"})
        message = client.get("/api/messages").json()[0]
        from app.database import SessionLocal
        from app.models import Message
        with SessionLocal() as db:
            record = db.get(Message, message["id"])
            record.status = "failed"
            record.retryable = False
            db.commit()
        assert client.post(f"/api/messages/{message['id']}/retry").status_code == 409
