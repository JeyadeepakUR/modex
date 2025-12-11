import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/hhs")

async def expire_stale_locks():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        now = datetime.now(timezone.utc)
        result = await conn.execute(
            """UPDATE locks 
               SET status = 'EXPIRED' 
               WHERE status = 'HELD' 
               AND EXTRACT(EPOCH FROM ($1 - last_heartbeat)) > ttl_seconds""",
            now
        )
        count = int(result.split()[-1])
        if count > 0:
            print(f"[{now.isoformat()}] Expired {count} stale lock(s)")
    finally:
        await conn.close()

async def worker_loop():
    print("Worker started: monitoring stale locks every 5 seconds")
    while True:
        try:
            await expire_stale_locks()
        except Exception as e:
            print(f"Worker error: {e}")
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(worker_loop())
