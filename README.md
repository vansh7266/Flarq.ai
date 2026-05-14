# FLARQ (Phase 2)

**FLARQ** is an agentic job search operating system for [flarq.ai](https://flarq.ai)

## Architecture

### MongoDB MCP Integration

Flarq uses a real Model Context Protocol server for database operations that flow through the agent and API services. The MCP server (`backend/mcp_server/flarq_mongo_mcp.py`) exposes MongoDB tools over stdio transport:

- `mongodb_find_one` / `mongodb_find_many`
- `mongodb_insert_one` / `mongodb_update_one` / `mongodb_delete_one`
- `mongodb_aggregate` — powers analytics pipelines
- `mongodb_inspect_schema` — sample-based schema and index introspection
- `mongodb_count`
- `mongodb_vector_search` — optional Atlas `$vectorSearch` (returns empty if unavailable)

The FastAPI layer uses `FlarqMCPClient` (`backend/app/services/mongodb/mcp_client.py`), which spawns this MCP server per tool call and speaks the MCP protocol over stdio. This is the agent's database superpower: operations are MCP tool calls, not ad hoc Motor wrappers posing as MCP.
