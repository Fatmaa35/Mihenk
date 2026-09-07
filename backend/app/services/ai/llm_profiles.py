from dataclasses import dataclass


@dataclass(frozen=True)
class LLMProfile:
    name: str
    temperature: float
    structured_output: bool
    max_history_messages: int = 0


MATCHER_PROFILE = LLMProfile(
    name="matching_analyst",
    temperature=0.15,
    structured_output=True,
)

ASSISTANT_PROFILE = LLMProfile(
    name="literary_assistant",
    temperature=0.65,
    structured_output=False,
    max_history_messages=8,
)
