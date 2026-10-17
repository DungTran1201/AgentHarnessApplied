from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.core.telemetry_middleware import TelemetryMiddleware
from src.api.v1.router import api_router

app = FastAPI(
    title="AI-Chan Backend API",
    description="Core backend server communicating with LLM integration engine",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Telemetry & Performance monitoring middleware (BR-019, NFR-020)
app.add_middleware(TelemetryMiddleware)

# Mount API Routers
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    try:
        from src.services.tools.registry import ToolRegistryService
        ToolRegistryService.seed_tools()
    except Exception as e:
        print(f"Tool seeding on startup warning: {e}")

from src.api.v1.bot import HealthResponse

@app.get("/")
async def root():
    return {
        "service": "ai-backend",
        "status": "running",
        "docs_url": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="ai-backend",
        version="1.0.0",
        details={
            "service": "ai-backend",
            "database": "sqlite_connected"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
