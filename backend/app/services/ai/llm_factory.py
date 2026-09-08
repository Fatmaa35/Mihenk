from app.config import Settings
from app.services.ai.gemini import GeminiExplainer
from app.services.ai.ollama import OllamaExplainer


def create_explainer(settings: Settings, usage_sink=None):
    if settings.ai_provider == "ollama":
        return OllamaExplainer(
            settings.ollama_base_url, settings.ollama_model, settings.llm_enabled,
            usage_sink, settings.ai_input_cost_per_million_usd,
            settings.ai_output_cost_per_million_usd,
            api_key=settings.ollama_api_key,
        )
    return GeminiExplainer(
        settings.gemini_api_key, settings.gemini_model,
        settings.llm_enabled and settings.ai_provider == "gemini",
        usage_sink, settings.ai_input_cost_per_million_usd,
        settings.ai_output_cost_per_million_usd,
    )
