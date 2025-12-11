import asyncio
import asyncpg
import os
from datetime import datetime, timezone

# Get database URL from environment
def get_db_url():
    url = os.getenv("DATABASE_URL")
    if not url or url.strip() == "":
        raise RuntimeError(f"DATABASE_URL missing or empty: {url!r}")
    return url

async def expire_stale_locks():
    db_url = get_db_url()
    conn = await asyncpg.connect(db_url)
    try:
        now = datetime.now(timezone.utc)
        result = await conn.execute(
            """
            UPDATE locks 
            SET status = 'EXPIRED'
            WHERE status = 'HELD'
            AND EXTRACT(EPOCH FROM ($1 - last_heartbeat)) > ttl_seconds
            """,
            now
        )
        count = int(result.split()[-1])
        if count > 0:
            print(f"[{now.isoformat()}] Expired {count} stale lock(s)")
    finally:
        await conn.close()

async def run_expiry_loop():
    print("Worker started: monitoring stale locks every 5 seconds")
    while True:
        try:
            await expire_stale_locks()
        except Exception as e:
            print(f"Worker error: {e}")
        await asyncio.sleep(5)