from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class CandidateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        value = " ".join(value.split())
        if not any(character.isalpha() for character in value):
            raise ValueError("Name must contain letters")
        return value

class CandidateOut(CandidateCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class MessageCreate(BaseModel):
    candidate_ids: list[int] = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=1000)
    @field_validator("body")
    @classmethod
    def no_blank(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be blank")
        return value.strip()

class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    body: str
    status: str
    provider_id: str | None
    error_code: str | None
    error_message: str | None
    retryable: bool
    attempts: int
    created_at: datetime
    updated_at: datetime

class MessageWithCandidate(MessageOut):
    candidate: CandidateOut

class WebhookUpdate(BaseModel):
    provider_id: str
    status: str
    error_code: str | None = None
    error_message: str | None = None
    retryable: bool = False

