from fastapi import APIRouter, HTTPException, Depends
from schemas import ResourceCreate, ResourceResponse
from db import get_connection
import asyncpg

router = APIRouter()

@router.post("/resources", response_model=ResourceResponse)
async def create_resource(resource: ResourceCreate, conn: asyncpg.Connection = Depends(get_connection)):
    try:
        row = await conn.fetchrow(
            "INSERT INTO resources (type, identifier) VALUES ($1, $2) RETURNING id, type, identifier",
            resource.type, resource.identifier
        )
        return ResourceResponse(id=row["id"], type=row["type"], identifier=row["identifier"])
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Resource already exists")

@router.get("/resources", response_model=list[ResourceResponse])
async def list_resources(conn: asyncpg.Connection = Depends(get_connection)):
    rows = await conn.fetch("SELECT id, type, identifier FROM resources ORDER BY type, identifier")
    return [ResourceResponse(id=r["id"], type=r["type"], identifier=r["identifier"]) for r in rows]

@router.get("/resources/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: str, conn: asyncpg.Connection = Depends(get_connection)):
    row = await conn.fetchrow("SELECT id, type, identifier FROM resources WHERE id = $1", resource_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    return ResourceResponse(id=row["id"], type=row["type"], identifier=row["identifier"])
