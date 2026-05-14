from typing import Any


def tool_catalog() -> list[dict[str, Any]]:
    """Structured tool definitions for the FLARQ agent."""
    return [
        {
            "name": "mongo.find",
            "description": "Read-only MongoDB queries executed via the MongoMCPClient layer.",
        }
    ]
