from datetime import datetime
from typing import Optional
from uuid import UUID

class Resource:
    def __init__(self, id: UUID, type: str, identifier: str):
        self.id = id
        self.type = type
        self.identifier = identifier

class Lock:
    def __init__(
        self,
        id: UUID,
        resource_id: UUID,
        owner_id: str,
        status: str,
        ttl_seconds: int,
        created_at: datetime,
        last_heartbeat: datetime
    ):
        self.id = id
        self.resource_id = resource_id
        self.owner_id = owner_id
        self.status = status
        self.ttl_seconds = ttl_seconds
        self.created_at = created_at
        self.last_heartbeat = last_heartbeat
