from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

load_dotenv()
from routers import rank
from rag.db import DatabaseManager

# event manager to execute tasks on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = DatabaseManager()
    try:
        db.init_db()
    except Exception:
        print("WARNING: Database connection failed during startup. Ensure PostgreSQL container is running.")
    yield

app = FastAPI(
    title="HireFlow AI Service",
    description="Intelligent screening and ranking engine for resumes.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(rank.router)

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "HireFlow AI Engine"}