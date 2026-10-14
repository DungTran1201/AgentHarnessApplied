"""Custom exceptions for the AI-Chan Discord Bot application."""


class DiscordBotError(Exception):
    """Base exception for all AI-Chan Discord Bot related errors."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(self.message)


class AIChanAPIError(DiscordBotError):
    """Raised when an error occurs while communicating with AI-Chan Backend API."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message)


class AIChanTimeoutError(DiscordBotError):
    """Raised when an AI-Chan Backend API request times out."""

    def __init__(self, message: str = "Request to AI-Chan Backend API timed out.") -> None:
        super().__init__(message)


# Backward compatibility aliases for reference bot (discord-bot-connect-to-antigravity)
AntigravityError = DiscordBotError
AntigravityAPIError = AIChanAPIError
AntigravityTimeoutError = AIChanTimeoutError
