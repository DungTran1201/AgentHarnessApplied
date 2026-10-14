"""Unit tests for AIChanClient (and AntigravityService compatibility alias)."""

from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.discord_bot.client import AIChanClient, AntigravityService
from src.discord_bot.exceptions import (
    AIChanAPIError,
    AIChanTimeoutError,
    AntigravityAPIError,
    AntigravityTimeoutError,
)
from src.discord_bot.schemas import PromptRequest


@pytest.fixture
def prompt_request() -> PromptRequest:
    return PromptRequest(
        prompt="Explain quantum entanglement briefly.",
        model="gemini-1.5-pro",
        metadata={"user_id": "123456789", "channel_id": "987654321"},
    )


@pytest.fixture
def sample_prompt_response_payload() -> dict[str, Any]:
    return {
        "response": "Quantum entanglement is a phenomenon where particles remain connected.",
        "model": "gemini-1.5-pro",
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
        },
    }


@pytest.mark.asyncio
async def test_ask_successful_response(
    prompt_request: PromptRequest,
    sample_prompt_response_payload: dict[str, Any],
) -> None:
    """Test successful prompt generation response from AI-Chan API."""
    service = AIChanClient(base_url="http://test-aichan.local", api_key="secret-key")

    mock_response = httpx.Response(
        status_code=200,
        json=sample_prompt_response_payload,
        request=httpx.Request("POST", "http://test-aichan.local/api/v1/prompt"),
    )

    with patch.object(service._client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await service.ask(prompt_request)

        assert result.response == sample_prompt_response_payload["response"]
        assert result.model == "gemini-1.5-pro"
        assert result.usage is not None
        assert result.usage.total_tokens == 30
        mock_post.assert_awaited_once()

    await service.close()


@pytest.mark.asyncio
async def test_antigravity_service_alias_compatible(
    prompt_request: PromptRequest,
    sample_prompt_response_payload: dict[str, Any],
) -> None:
    """Test that AntigravityService alias functions identically."""
    service = AntigravityService(base_url="http://test-aichan.local", api_key="secret-key")

    mock_response = httpx.Response(
        status_code=200,
        json=sample_prompt_response_payload,
        request=httpx.Request("POST", "http://test-aichan.local/api/v1/prompt"),
    )

    with patch.object(service._client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        result = await service.ask(prompt_request)
        assert result.response == sample_prompt_response_payload["response"]

    await service.close()


@pytest.mark.asyncio
async def test_ask_timeout_raises_timeout_error(prompt_request: PromptRequest) -> None:
    """Test that httpx TimeoutException is mapped to AIChanTimeoutError and AntigravityTimeoutError."""
    service = AIChanClient(base_url="http://test-aichan.local")

    with patch.object(service._client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Timeout reached")

        with pytest.raises(AIChanTimeoutError):
            await service.ask(prompt_request)

        # Also verifiable through legacy exception alias
        with pytest.raises(AntigravityTimeoutError):
            await service.ask(prompt_request)

    await service.close()


@pytest.mark.asyncio
async def test_ask_http_error_raises_api_error(prompt_request: PromptRequest) -> None:
    """Test that non-200 HTTP responses raise AIChanAPIError."""
    service = AIChanClient(base_url="http://test-aichan.local")

    mock_response = httpx.Response(
        status_code=500,
        text="Internal Server Error in model pipeline",
        request=httpx.Request("POST", "http://test-aichan.local/api/v1/prompt"),
    )

    with patch.object(service._client, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        with pytest.raises(AIChanAPIError) as exc_info:
            await service.ask(prompt_request)

        assert exc_info.value.status_code == 500

    await service.close()


@pytest.mark.asyncio
async def test_health_check_success() -> None:
    """Test successful health check."""
    service = AIChanClient(base_url="http://test-aichan.local")

    mock_response = httpx.Response(
        status_code=200,
        json={"status": "healthy", "version": "1.0.0", "service": "ai-backend"},
        request=httpx.Request("GET", "http://test-aichan.local/health"),
    )

    with patch.object(service._client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        health = await service.health_check()
        assert health.status == "healthy"
        assert health.version == "1.0.0"
        assert health.service == "ai-backend"

    await service.close()
