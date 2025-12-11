import os
import asyncpg
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

database_url = os.getenv("DATABASE_URL")
print(database_url)
_pool: Optional[asyncpg.Pool] = None

def get_database_url():
    return os.getenv("DATABASE_URL")


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        database_url = get_database_url()
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    return _pool

async def get_connection():
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
