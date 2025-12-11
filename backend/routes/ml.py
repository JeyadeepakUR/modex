from fastapi import APIRouter, Depends
from schemas import MLRequest, MLSuggestion
from db import get_connection
import asyncpg
from datetime import datetime, timezone
import math

router = APIRouter()

@router.post("/ml/suggest", response_model=MLSuggestion)
async def suggest_ttl(ml_req: MLRequest, conn: asyncpg.Connection = Depends(get_connection)):
    # Simple heuristic ML model
    # Fetch historical lock data for this resource
    rows = await conn.fetch(
        """SELECT ttl_seconds, EXTRACT(EPOCH FROM (last_heartbeat - created_at)) as duration 
           FROM locks 
           WHERE resource_id = $1 AND status IN ('RELEASED', 'EXPIRED') 
           ORDER BY created_at DESC LIMIT 10""",
        ml_req.resource_id
    )
    
    if rows:
        avg_duration = sum(r["duration"] for r in rows) / len(rows)
        avg_ttl = sum(r["ttl_seconds"] for r in rows) / len(rows)
        
        # Suggest TTL with 20% buffer
        suggested_ttl = int(avg_duration * 1.2)
        suggested_ttl = max(60, min(suggested_ttl, 3600))  # Clamp between 1 min and 1 hour
        
        # Anomaly score based on variance
        variance = sum((r["duration"] - avg_duration) ** 2 for r in rows) / len(rows)
        std_dev = math.sqrt(variance)
        anomaly_score = min(1.0, std_dev / (avg_duration + 1))
    else:
        # No history, use default
        suggested_ttl = ml_req.historical_ttl or 300
        anomaly_score = 0.0
    
    return MLSuggestion(suggested_ttl=suggested_ttl, anomaly_score=round(anomaly_score, 3))
