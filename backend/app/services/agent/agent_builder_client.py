"""Google Cloud Agent Builder (Discovery Engine) integration for FLARQ.

This module provides a client for Google Cloud Agent Builder, which is the
core technology required by the Google Cloud Rapid Agent Hackathon. The agent
builder provides managed orchestration, grounding, and enterprise data stores.

When AGENT_BUILDER_ID is configured, the agent uses Agent Builder for:
- First-pass conversation routing and grounding
- Knowledge base queries via Discovery Engine data stores
- Managed agent deployment and orchestration

For complex tool-calling that requires MCP integration, the system falls back
to the custom Vertex AI agent loop (agent_builder.py).
"""
from __future__ import annotations

import json
from typing import Any

import structlog
from google.cloud import discoveryengine_v1beta as discoveryengine

from app.core.config import get_settings

logger = structlog.get_logger("agent_builder_client")


class AgentBuilderClient:
    """Client for Google Cloud Agent Builder (Discovery Engine).

    Uses the ConversationalSearchService API to interact with an Agent Builder
    agent that has been configured in the Google Cloud Console.

    Setup:
    1. Go to Agent Builder in Google Cloud Console
    2. Create a new app/agent
    3. Connect a data store (website, PDF, BigQuery)
    4. Configure extensions/tools as needed
    5. Copy the engine ID and set AGENT_BUILDER_ID env var
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.project = settings.google_cloud_project
        self.location = settings.google_cloud_location
        self.agent_builder_id = settings.agent_builder_id
        self._client: discoveryengine.ConversationalSearchServiceClient | None = None
        self._session_client: discoveryengine.SessionServiceClient | None = None

    @property
    def is_configured(self) -> bool:
        """Check if Agent Builder is properly configured."""
        return self.agent_builder_id is not None and self.agent_builder_id.strip() != ""

    def _get_client(self) -> discoveryengine.ConversationalSearchServiceClient:
        if self._client is None:
            self._client = discoveryengine.ConversationalSearchServiceClient()
        return self._client

    def _get_session_client(self) -> discoveryengine.SessionServiceClient:
        if self._session_client is None:
            self._session_client = discoveryengine.SessionServiceClient()
        return self._session_client

    def _engine_path(self) -> str:
        """Build the engine resource path."""
        return (
            f"projects/{self.project}"
            f"/locations/{self.location}"
            f"/collections/default_collection"
            f"/engines/{self.agent_builder_id}"
        )

    def _session_path(self, session_id: str | None = None) -> str:
        """Build the session resource path."""
        base = f"{self._engine_path()}/sessions"
        if session_id:
            return f"{base}/{session_id}"
        return base

    async def converse(
        self,
        query: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        """Send a message to the Agent Builder agent and get a response.

        This is the primary method for interacting with the Agent Builder.
        It creates or continues a conversation session and sends the user's
        query to the agent.

        Args:
            query: The user's message
            session_id: Optional existing session ID for multi-turn conversation

        Returns:
            Dict with 'reply', 'session_id', and 'search_results'
        """
        client = self._get_client()
        session_client = self._get_session_client()

        try:
            # Create or continue a session
            if session_id:
                session_path = self._session_path(session_id)
                session = discoveryengine.Session(name=session_path)
                logger.info("agent_builder_continue_session", session_id=session_id)
            else:
                session = discoveryengine.Session()
                session = session_client.create_session(
                    parent=self._session_path(),
                    session=session,
                )
                logger.info("agent_builder_new_session", session_name=session.name)

            # Build the conversational request
            request = discoveryengine.ConverseConversationRequest(
                name=session.name,
                query=discoveryengine.ConverseConversationRequest.Query(
                    input=query,
                ),
            )

            response = client.converse_conversation(request=request)

            # Extract session ID from the full path
            new_session_id = session.name.split("/")[-1] if session.name else None

            # Extract search results for grounding citations
            search_results = []
            if hasattr(response, 'search_results'):
                for r in response.search_results:
                    search_results.append({
                        "document": r.document.name if hasattr(r, 'document') else "",
                        "relevance_score": r.relevance_score if hasattr(r, 'relevance_score') else 0.0,
                    })

            return {
                "reply": response.reply.reply if response.reply else "",
                "session_id": new_session_id,
                "search_results": search_results,
            }

        except Exception as e:
            logger.error("agent_builder_converse_error", error=str(e))
            raise

    async def create_session(self) -> str:
        """Create a new conversation session with the Agent Builder.

        Returns:
            The session ID for the new session
        """
        session_client = self._get_session_client()
        session = discoveryengine.Session()
        session = session_client.create_session(
            parent=self._session_path(),
            session=session,
        )
        session_id = session.name.split("/")[-1]
        logger.info("agent_builder_session_created", session_id=session_id)
        return session_id

    async def delete_session(self, session_id: str) -> None:
        """Delete a conversation session.

        Args:
            session_id: The session ID to delete
        """
        session_client = self._get_session_client()
        session_path = self._session_path(session_id)
        session_client.delete_session(name=session_path)
        logger.info("agent_builder_session_deleted", session_id=session_id)


# Singleton instance
agent_builder_client = AgentBuilderClient()
