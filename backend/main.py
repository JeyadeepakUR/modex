import os
import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes import resources, locks, ml
from worker import run_expiry_loop

app = FastAPI(title="Hospital Hold System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resources.router, prefix="/api")
app.include_router(locks.router, prefix="/api")
app.include_router(ml.router, prefix="/api")

@app.get("/")
@app.head("/")
async def root():
    return {"message": "Hospital Hold System API"}

@app.get("/api/health")
@app.head("/api/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def start_background_worker():
    print("Starting worker task...")
    asyncio.create_task(run_expiry_loop())

if __name__ == "__main__":
    # CRITICAL: reload=False on Render
    uvicorn.run("main:app", host="0.0.0.0", port=8000)