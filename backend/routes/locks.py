from fastapi import APIRouter, HTTPException, Depends
from schemas import LockAcquire, LockRelease, LockHeartbeat, LockResponse
from db import get_connection
import asyncpg
from datetime import datetime, timezone

router = APIRouter()

@router.post("/locks/acquire", response_model=LockResponse)
async def acquire_lock(lock_req: LockAcquire, conn: asyncpg.Connection = Depends(get_connection)):
    async with conn.transaction():
        # Check resource exists
        resource = await conn.fetchrow("SELECT id FROM resources WHERE id = $1 FOR UPDATE", lock_req.resource_id)
        if not resource:
            raise HTTPException(status_code=404, detail="Resource not found")
        
        # Check for existing lock
        existing = await conn.fetchrow(
            "SELECT id, owner_id, status, last_heartbeat, ttl_seconds FROM locks WHERE resource_id = $1 FOR UPDATE",
            lock_req.resource_id
        )
        
        now = datetime.now(timezone.utc)
        
        if existing:
            # Check if expired
            elapsed = (now - existing["last_heartbeat"]).total_seconds()
            is_expired = elapsed > existing["ttl_seconds"]
            
            if existing["status"] == "HELD" and not is_expired:
                if existing["owner_id"] != lock_req.owner_id:
                    raise HTTPException(status_code=409, detail="Lock already held by another owner")
                # Same owner reacquiring
                row = await conn.fetchrow(
                    """UPDATE locks SET last_heartbeat = $1, ttl_seconds = $2 
                       WHERE resource_id = $3 
                       RETURNING id, resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat""",
                    now, lock_req.ttl_seconds, lock_req.resource_id
                )
            else:
                # Override expired or released lock
                row = await conn.fetchrow(
                    """UPDATE locks SET owner_id = $1, status = 'HELD', ttl_seconds = $2, last_heartbeat = $3, created_at = $4 
                       WHERE resource_id = $5 
                       RETURNING id, resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat""",
                    lock_req.owner_id, lock_req.ttl_seconds, now, now, lock_req.resource_id
                )
        else:
            # Create new lock
            row = await conn.fetchrow(
                """INSERT INTO locks (resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat) 
                   VALUES ($1, $2, 'HELD', $3, $4, $5) 
                   RETURNING id, resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat""",
                lock_req.resource_id, lock_req.owner_id, lock_req.ttl_seconds, now, now
            )
        
        return LockResponse(**dict(row))

@router.post("/locks/release")
async def release_lock(lock_req: LockRelease, conn: asyncpg.Connection = Depends(get_connection)):
    async with conn.transaction():
        existing = await conn.fetchrow(
            "SELECT owner_id, status FROM locks WHERE resource_id = $1 FOR UPDATE",
            lock_req.resource_id
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="Lock not found")
        
        if existing["owner_id"] != lock_req.owner_id:
            raise HTTPException(status_code=403, detail="Lock owned by different owner")
        
        await conn.execute(
            "UPDATE locks SET status = 'RELEASED' WHERE resource_id = $1",
            lock_req.resource_id
        )
        
        return {"message": "Lock released"}

@router.post("/locks/heartbeat")
async def heartbeat_lock(lock_req: LockHeartbeat, conn: asyncpg.Connection = Depends(get_connection)):
    now = datetime.now(timezone.utc)
    result = await conn.execute(
        "UPDATE locks SET last_heartbeat = $1 WHERE resource_id = $2 AND owner_id = $3 AND status = 'HELD'",
        now, lock_req.resource_id, lock_req.owner_id
    )
    
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Active lock not found for this owner")
    
    return {"message": "Heartbeat updated"}

@router.get("/locks/{resource_id}", response_model=LockResponse)
async def get_lock(resource_id: str, conn: asyncpg.Connection = Depends(get_connection)):
    row = await conn.fetchrow(
        "SELECT id, resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat FROM locks WHERE resource_id = $1",
        resource_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lock not found")
    return LockResponse(**dict(row))

@router.get("/locks", response_model=list[LockResponse])
async def list_locks(conn: asyncpg.Connection = Depends(get_connection)):
    rows = await conn.fetch(
        "SELECT id, resource_id, owner_id, status, ttl_seconds, created_at, last_heartbeat FROM locks ORDER BY created_at DESC"
    )
    return [LockResponse(**dict(r)) for r in rows]
