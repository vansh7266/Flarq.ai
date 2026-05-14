class AgentBuilderClient:
    """Google Cloud Agent Builder integration (Phase 2)."""

    def __init__(self) -> None:
        self._configured = False

    async def run(self, prompt: str) -> str:
        raise RuntimeError(
            "AgentBuilderClient.run is not configured. "
            f"Prompt length: {len(prompt)} (Phase 2 wiring)."
        )
