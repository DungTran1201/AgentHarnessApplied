"""Pydantic data schemas for AI-Chan Discord Bot request and response models."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    """Request model for AI prompt execution."""
    model_config = {"extra": "ignore"}

    prompt: str = Field(..., min_length=1, description="Prompt text to send to AI model")
    model: str = Field(default="default", description="Model identifier to use")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, gt=0)
    metadata: Dict[str, str] = Field(default_factory=dict, description="Execution and routing metadata")


class UsageInfo(BaseModel):
    """Token usage metrics."""
    model_config = {"extra": "ignore"}

    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class PromptResponse(BaseModel):
    """Response model from AI prompt execution."""
    model_config = {"extra": "ignore"}

    response: str
    model: Optional[str] = None
    usage: Optional[UsageInfo] = None


class HealthResponse(BaseModel):
    """Backend service health response model."""
    model_config = {"extra": "allow"}

    status: str = Field(default="healthy")
    service: Optional[str] = Field(default="ai-backend")
    version: Optional[str] = Field(default="1.0.0")
    details: Dict[str, Any] = Field(default_factory=dict)
