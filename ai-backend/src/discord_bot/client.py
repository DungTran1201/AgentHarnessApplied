"""Asynchronous service client for communicating with AI-Chan Backend API."""

import logging
from typing import Any, Optional

import httpx
from pydantic import ValidationError

from src.discord_bot.exceptions import (
    AIChanAPIError,
    AIChanTimeoutError,
    AntigravityAPIError,
    AntigravityTimeoutError,
)
from src.discord_bot.schemas import HealthResponse, PromptRequest, PromptResponse

logger = logging.getLogger(__name__)


class AIChanClient:
    """Async HTTP service client for AI-Chan Backend operations."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        """Initialize AI-Chan HTTP client with base configuration.

        Args:
            base_url: Base URL of AI-Chan Backend API.
            api_key: Optional service token for authentication.
            timeout_seconds: Timeout in seconds for API calls.
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = httpx.Timeout(timeout_seconds, connect=10.0)

        headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self._client: httpx.AsyncClient = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=self.timeout,
        )

    async def ask(self, request: PromptRequest) -> PromptResponse:
        """Send a prompt to the AI-Chan AI orchestration engine.

        Args:
            request: PromptRequest containing user prompt and generation parameters.

        Returns:
            PromptResponse containing generated text and usage metrics.

        Raises:
            AIChanTimeoutError: If request exceeds configured timeout.
            AIChanAPIError: If API returns error status code or invalid response.
        """
        endpoint = "/api/v1/prompt"
        payload = request.model_dump(exclude_none=True)

        logger.debug("Sending prompt to AI-Chan Backend API: %s", endpoint)
        try:
            response = await self._client.post(endpoint, json=payload)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            return PromptResponse.model_validate(data)
        except httpx.TimeoutException as exc:
            logger.error("Timeout while calling AI-Chan API at %s: %s", endpoint, exc)
            raise AIChanTimeoutError(
                "AI-Chan AI service timed out while processing."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP error %s from AI-Chan API: %s",
                exc.response.status_code,
                exc.response.text,
            )
            raise AIChanAPIError(
                f"AI-Chan API returned status {exc.response.status_code}: {exc.response.text}",
                status_code=exc.response.status_code,
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Network error while calling AI-Chan API: %s", exc)
            raise AIChanAPIError(
                f"Network error communicating with AI-Chan API: {exc}"
            ) from exc
        except (ValidationError, ValueError) as exc:
            logger.error("Failed to parse response from AI-Chan API: %s", exc)
            raise AIChanAPIError(
                f"Invalid response payload from AI-Chan API: {exc}"
            ) from exc

    async def health_check(self) -> HealthResponse:
        """Check the health status of the AI-Chan Backend service.

        Returns:
            HealthResponse indicating server health and metadata.

        Raises:
            AIChanTimeoutError: If health check times out.
            AIChanAPIError: If health check fails or returns error status.
        """
        endpoint = "/health"
        logger.debug("Checking AI-Chan API health at %s", endpoint)
        try:
            response = await self._client.get(endpoint)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            return HealthResponse.model_validate(data)
        except httpx.TimeoutException as exc:
            logger.warning("AI-Chan health check timed out: %s", exc)
            raise AIChanTimeoutError("AI-Chan health check timed out.") from exc
        except (httpx.HTTPStatusError, httpx.RequestError, ValidationError, ValueError) as exc:
            logger.warning("AI-Chan health check failed: %s", exc)
            raise AIChanAPIError(f"AI-Chan API health check failed: {exc}") from exc

    async def close(self) -> None:
        """Close the underlying HTTP client session."""
        if not self._client.is_closed:
            await self._client.aclose()
            logger.debug("Closed AI-Chan HTTP client session.")


# Backward compatibility alias for reference bot
AntigravityService = AIChanClient
