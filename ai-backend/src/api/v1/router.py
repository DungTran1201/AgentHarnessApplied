from fastapi import APIRouter, Request
from src.api.v1.auth import auth_router
from src.api.v1.conversations import conv_router
from src.api.v1.chat import chat_router
from src.api.v1.users import users_router
from src.api.v1.models import models_router
from src.api.v1.resources import resources_router
from src.api.v1.bot import (
    bot_router,
    execute_antigravity_prompt,
    PromptRequest,
    PromptResponse,
    HealthResponse
)
from src.api.v1.projects import projects_router
from src.api.v1.prompts import prompts_router
from src.api.v1.skills import skills_router

api_router = APIRouter()

# Healthcheck endpoint (compatible with reference bot HealthResponse)
@api_router.get("/health", response_model=HealthResponse)
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

# Antigravity Prompt Execution endpoint (POST /api/v1/prompt)
@api_router.post("/prompt", response_model=PromptResponse, summary="Execute prompt through Antigravity/AI-Chan project graph")
async def prompt_endpoint(
    prompt_req: PromptRequest,
    req: Request
):
    return await execute_antigravity_prompt(prompt_req, req)


# Mount sub-routers
api_router.include_router(auth_router)
api_router.include_router(conv_router)
api_router.include_router(chat_router)
api_router.include_router(users_router)
api_router.include_router(models_router)
api_router.include_router(resources_router)
api_router.include_router(bot_router)
api_router.include_router(projects_router)
api_router.include_router(prompts_router)
api_router.include_router(skills_router)



