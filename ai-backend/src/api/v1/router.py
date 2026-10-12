from fastapi import APIRouter
from src.api.v1.auth import auth_router
from src.api.v1.conversations import conv_router
from src.api.v1.chat import chat_router
from src.api.v1.users import users_router
from src.api.v1.models import models_router
from src.api.v1.resources import resources_router
from src.api.v1.bot import bot_router
from src.api.v1.projects import projects_router
from src.api.v1.prompts import prompts_router
from src.api.v1.skills import skills_router

api_router = APIRouter()

# Healthcheck endpoint
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-backend",
        "database": "sqlite_connected",
        "version": "1.0.0"
    }

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


