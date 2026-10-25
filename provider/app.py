import asyncio
import os
import uuid
import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Simulated Communication Provider")
SECRET = os.getenv("WEBHOOK_SECRET", "local-webhook-secret")
class SendRequest(BaseModel):
    to: str
    body: str = Field(min_length=1, max_length=1000)
    callback_url: str

async def notify(url: str, provider_id: str, phone: str):
    await asyncio.sleep(1)
    final = "failed" if phone.endswith("8888") else "delivered"
    payload = {"provider_id": provider_id, "status": final}
    if final == "failed":
        payload.update(
            error_code="delivery_failed",
            error_message="The recipient could not receive this message.",
            retryable=False,
        )
    async with httpx.AsyncClient(timeout=4) as client:
        try:
            await client.post(
                url,
                json=payload,
                headers={"x-webhook-secret": SECRET},
            )
        except httpx.HTTPError:
            return
    if final == "delivered":
        await asyncio.sleep(2)
        async with httpx.AsyncClient(timeout=4) as client:
            try:
                await client.post(
                    url,
                    json={"provider_id": provider_id, "status": "read"},
                    headers={"x-webhook-secret": SECRET},
                )
            except httpx.HTTPError:
                pass

@app.get("/health")
def health():
    return {"status": "operational"}

@app.post("/messages", status_code=202)
def send(payload: SendRequest, tasks: BackgroundTasks):
    if payload.to.endswith("0000"):
        raise HTTPException(
            400,
            {
                "code": "invalid_recipient",
                "message": "The recipient number is invalid.",
            },
        )
    if payload.to.endswith("7777"):
        raise HTTPException(
            429,
            {
                "code": "rate_limited",
                "message": "Too many messages were sent in a short period.",
            },
        )
    if payload.to.endswith("1234"):
        raise HTTPException(
            503,
            {
                "code": "temporary_failure",
                "message": "The provider is temporarily unavailable.",
            },
        )
    provider_id = f"msg_{uuid.uuid4().hex}"
    tasks.add_task(notify, payload.callback_url, provider_id, payload.to)
    return {"id": provider_id, "status": "sent"}

