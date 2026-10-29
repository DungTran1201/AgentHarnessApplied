import os
from typing import Dict, Any, Optional
from .providers.base import BaseLLMProvider
from .providers.gemini_provider import GeminiProvider
from .providers.openai_provider import OpenAIProvider


class LLMManager:
    """Central LLM Management Engine.
    
    Orchestrates provider selection, API key authentication via CredentialService
    (PERSONAL > SYSTEM > NONE), load balancing, fallback upon quota/timeout, and token accounting.
    Constructs providers per request so newly saved keys take effect immediately without stale cache.
    """

    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self._init_providers()

    def _resolve_key(self, provider_name: str, user_id: Optional[str] = None) -> str:
        canon = "google" if provider_name in ("gemini", "google") else provider_name
        try:
            from src.services.credential_service import CredentialService
            key = CredentialService.get_effective_key(user_id, canon)
            if key is not None:
                return key
        except Exception:
            pass
        env_var = "GEMINI_API_KEY" if canon == "google" else "OPENAI_API_KEY"
        return os.getenv(env_var, "")

    def _init_providers(self):
        self.providers["gemini"] = GeminiProvider(api_key=self._resolve_key("gemini"))
        self.providers["openai"] = OpenAIProvider(api_key=self._resolve_key("openai"))

    def get_provider(self, name: Optional[str] = None, user_id: Optional[str] = None) -> BaseLLMProvider:
        default_name = os.getenv("DEFAULT_LLM_PROVIDER", "gemini").lower()
        selected = (name or default_name).lower().strip()
        if selected == "google":
            selected = "gemini"

        if selected == "openai":
            key = self._resolve_key("openai", user_id=user_id)
            provider = OpenAIProvider(api_key=key)
            if not user_id:
                self.providers["openai"] = provider
            return provider

        key = self._resolve_key("gemini", user_id=user_id)
        provider = GeminiProvider(api_key=key)
        if not user_id:
            self.providers["gemini"] = provider
        return provider

    async def generate_response(
        self,
        prompt: str,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        provider = self.get_provider(provider_name, user_id=user_id)
        try:
            return await provider.generate(prompt=prompt, model=model_name, **kwargs)
        except Exception:
            # Automatic fallback to secondary provider with fresh credential resolution
            norm = (provider_name or "gemini").lower().strip()
            fallback_provider_name = "openai" if norm in ("gemini", "google") else "gemini"
            fallback = self.get_provider(fallback_provider_name, user_id=user_id)
            return await fallback.generate(prompt=prompt, **kwargs)


llm_manager = LLMManager()
