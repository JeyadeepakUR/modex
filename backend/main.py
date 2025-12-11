import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import resources, locks, ml

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
