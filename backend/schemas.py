from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class ResourceCreate(BaseModel):
    type: str
    identifier: str

class ResourceResponse(BaseModel):
    id: UUID
    type: str
    identifier: str

class LockAcquire(BaseModel):
    resource_id: UUID
    owner_id: str
    ttl_seconds: int = 300

class LockRelease(BaseModel):
    resource_id: UUID
    owner_id: str

class LockHeartbeat(BaseModel):
    resource_id: UUID
    owner_id: str

class LockResponse(BaseModel):
    id: UUID
    resource_id: UUID
    owner_id: str
    status: str
    ttl_seconds: int
    created_at: datetime
    last_heartbeat: datetime

class MLSuggestion(BaseModel):
    suggested_ttl: int
    anomaly_score: float

class MLRequest(BaseModel):
    resource_id: UUID
    owner_id: str
    historical_ttl: Optional[int] = None
