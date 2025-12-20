# OCI MCP Server Standard (Implementation Guide)

This document defines a standard for building and integrating OCI-focused MCP servers with this repo’s MCP client + agent architecture.

Use it as a reference when:
- Adding a new OCI MCP server (OPSI/Logging/Unified/Custom)
- Evolving existing servers’ tool surfaces
- Optimizing MCP client behavior (timeouts, caching, manifests)
- Integrating server capabilities into OCI agents (DB/Log/OCI/Orchestrator)

## Non‑Negotiables (Security)

- Zero hardcoding of sensitive values in source.
- Every secret/config value must be referenced via `process.env` and documented as: `[Link to Secure Variable: VARIABLE_NAME]`.
- Development values live in `.env.local` (must remain in `.gitignore`).
- Production/deployment must support injection from OCI Vault (the app should accept env vars populated by the platform).

## Glossary

- MCP server: A process or HTTP service exposing MCP tools and optional resources.
- Tool: An action callable by the client (`list_*`, `get_*`, `skill_*`, `execute_*`, etc.).
- ServerRegistry: Manages connections to multiple MCP servers.
- ToolCatalog: Aggregates tools and provides stable names and execution routing.
- Qualified tool name: `${serverId}__${toolName}` (stable, always available).

## Repository Architecture (Where MCP Fits)

Server config
- Primary: `data/mcp-servers-db.json` (backend uses this by default)
- Extended: `data/mcp-servers.json`

Client infrastructure
- `services/mcpClient/ServerRegistry.ts` – connects/monitors servers
- `services/mcpClient/DynamicMCPClient.ts` – stdio + HTTP/SSE transports
- `services/mcpClient/ToolCatalog.ts` – tool aggregation, name resolution, execution, validation, retries
- `services/mcpClient/ServerManifest.ts` – `server://manifest` caching

Agents
- `services/server/agentFactory.ts` – DB/log/OCI/orchestrator agent composition

Troubleshooting
- Unified health: `GET /api/health/full`
- MCP runtime health: `GET /api/mcp/health`
- MCP config/env validation: `GET /api/mcp/config/validate`

## 1) Naming Conventions

### 1.1 Server IDs

Server IDs must be:
- kebab-case, unique, stable
- Semantically scoped

Recommended patterns (based on existing servers):
- `oci-mcp-opsi` – OCI Operations Insights MCP server
- `oci-mcp-logan` – OCI Logging Analytics MCP server
- `oci-mcp-unified` – Unified OCI MCP server
- `oracle-sqlcl` – SQLcl MCP server (stdio)

Avoid:
- Embedding environment/region in IDs (keep those in config/env)
- Renaming server IDs (breaks tool qualification + caches)

### 1.2 Tool Names

Tool names must be:
- snake_case or kebab-case (consistent within the server)
- Verb-first and explicit

Recommended categories:

Health / diagnostics
- `ping` (minimal, fast, no args)
- `health` or `healthcheck` (richer)
- `doctor` (deep, possibly slower)

Discovery / listing
- `list_compartments`, `list_databases`, `list_log_sources`
- Cache variants: `get_cached_*`, `list_cached_*`, `cache_search_*`

Execution
- Logging: `execute_logan_query`
- SQLcl: `run-sql`, `connect`, `list-connections`

Skills (high-level)
- Prefix with `skill_` for LLM-friendly composites:
  - `skill_get_fleet_summary`
  - `skill_analyze_cpu_usage`
  - `skill_detect_cost_anomalies`

### 1.3 Qualified Tool Names (Client-Side)

This repo’s `ToolCatalog` guarantees a stable qualified name for every MCP tool:

`<serverId>__<toolName>`

Example:
- `oci-mcp-opsi__skill_get_fleet_summary`
- `oracle-sqlcl__run-sql`

Agents should prefer qualified names when ambiguity is possible.

## 2) Standard Tool Schemas

### 2.1 Schema Rules

- Use JSON Schema input objects (MCP `inputSchema`).
- Prefer flat objects with explicit fields.
- Make optional fields optional; avoid strict `additionalProperties: false` unless required.
- Keep schemas permissive across model providers.

### 2.2 Cross-Server Context Fields

For OCI servers, standardize on these optional fields whenever applicable:
- `profile` (OCI CLI profile)
- `region` (OCI region)
- `compartment` / `compartment_id`
- `tenancy_ocid`

This client injects context for OPSI-like servers via `ToolCatalog.setContext()`.

### 2.3 Error Output Shape

When a tool fails, prefer a JSON object:

```json
{ "success": false, "error": "...", "suggestion": "..." }
```

This repo’s tool validation in `services/utils/mcpResponseValidator.ts` recognizes common error patterns.

## 3) Server Manifest Standard (server://manifest)

### 3.1 Why it matters

`DynamicMCPClient` caches tool metadata and will attempt to fetch `server://manifest` for richer capabilities.

### 3.2 Recommended manifest fields

Provide:
- `name`, `version`, `description`
- `capabilities.skills: string[]`
- `capabilities.tools` grouped by tier:
  - `tier1_instant`, `tier1_cache`, `tier2_api`, `tier3_database`, `tier3_heavy`, `tier4_admin`
- `usage_guide`
- `environment_variables: string[]` (names only)

This improves:
- Tool tier inference
- Agent routing
- UI/system diagnostics

## 4) Tool Tiers & Performance Contract

This repo uses a tier model (see `services/utils/toolClassification.ts`):

- Tier 1 (<100ms): cache/instant tools
- Tier 2 (100ms–1s): API list/get tools
- Tier 3 (1s–30s): heavy analytics / DB queries
- Tier 4 (variable): admin/destructive operations

Recommendations:
- Tier 1 tools should never block on OCI API calls.
- Tier 3 tools must accept time range parameters (e.g., `days_back`, `minutes_back`).
- Tier 4 tools must be explicit and safe by default (consider human-in-the-loop).

## 5) Caching Standard

### 5.1 MCP Tool Cache

The backend supports a tool-result cache (`services/cache/MCPToolCache.ts`) with per-tool TTLs and a global default:

- `[Link to Secure Variable: MCP_TOOL_CACHE_ENABLED]`
- `[Link to Secure Variable: MCP_TOOL_CACHE_DEFAULT_TTL_SECONDS]`

Guidelines for server authors:
- Provide cache-first tools (`get_cached_*`, `list_cached_*`) when possible.
- Prefer deterministic outputs for cacheable tools.
- Keep write/admin tools non-cacheable.

### 5.3 Cache Warming (Optional)

This repo can proactively warm high-value tool/cache entries after startup.

- Switch: `[Link to Secure Variable: CACHE_WARMING_ENABLED]`
- Implementation: `services/cache/CacheWarmingService.ts` (invoked from `services/server/mcpInitializer.ts`)

Server author guidance:
- Ensure warmed tools are safe and deterministic (typically Tier 1 cache + light Tier 2 list calls).
- Avoid warming Tier 3 heavy analytics by default.

### 5.2 Semantic LLM Cache

The semantic cache is separate and is for LLM responses:

- `[Link to Secure Variable: LLM_CACHE_ENABLED]`
- `[Link to Secure Variable: LLM_CACHE_TTL_SECONDS]`
- `[Link to Secure Variable: LLM_CACHE_SIMILARITY_THRESHOLD]`
- `[Link to Secure Variable: LLM_CACHE_MAX_SIZE]`

## 6) Client Integration Standard

### 6.1 Server Config Format

Servers are configured in `data/mcp-servers-db.json` / `data/mcp-servers.json`.

Production servers must use Streamable HTTP with OAuth; include `Authorization` headers from env vars.

HTTP server example (no hardcoded values):

```json
{
  "id": "oci-mcp-example",
  "name": "OCI Example Server",
  "description": "Example OCI MCP server",
  "url": "${MCP_EXAMPLE_HTTP_URL:-http://localhost:8010/mcp}",
  "headers": {
    "Authorization": "Bearer ${MCP_OAUTH_ACCESS_TOKEN}"
  },
  "transport": "http",
  "enabled": true,
  "autoConnect": true,
  "timeout": 60,
  "healthCheck": { "tool": "ping", "interval": 60000 }
}
```

Stdio server example (SQLcl-style):

```json
{
  "id": "oracle-sqlcl",
  "name": "Oracle SQLcl",
  "command": "${SQLCL_PATH}",
  "args": ["-mcp"],
  "env": {
    "TNS_ADMIN": "${SQLCL_TNS_ADMIN}",
    "DB_USERNAME": "${SQLCL_DB_USERNAME}",
    "DB_PASSWORD": "${SQLCL_DB_PASSWORD}"
  },
  "transport": "stdio",
  "enabled": true,
  "autoConnect": true
}
```

### 6.2 Connection & Timeout Guidance

Client timeouts (env):
- `[Link to Secure Variable: MCP_CLIENT_TIMEOUT_MS]`
- `[Link to Secure Variable: MCP_CONNECT_TIMEOUT_MS]`
- `[Link to Secure Variable: MCP_TOOL_TIMEOUT_MS]`

Server authors should:
- Keep `ping` fast
- Avoid large payloads; paginate results
- Prefer returning structured JSON over long text blobs

### 6.3 Tool Execution Reliability

`ToolCatalog.executeTool()` provides:
- Auto-connect attempts
- Optional retries (categorization via `mcpResponseValidator`)
- Parameter sanitization to schema keys
- Observability hooks

Server authors should return consistent JSON (or JSON-in-text) to maximize validation success.

## 7) Agent Integration Standard

### 7.1 Which servers each agent should see

In `services/server/agentFactory.ts`, agents are scoped by server IDs.

Recommended scoping:
- DB Agent: `oracle-sqlcl`, `oci-mcp-opsi`
- Log Agent: `oci-mcp-logan`, `oci-mcp-unified` (if it includes log/correlation)
- OCI Agent: `oci-mcp-unified` (plus specialized compute/network/cost servers if enabled)

### 7.2 Add “DB Skills” wrappers for stability

Prefer adding stable, task-specific wrapper tools at the agent layer that call SQLcl/OPSI under the hood.

Example pattern (this repo):
- `services/server/dbSkillTools.ts` defines `db_*` tools which are stable even if raw MCP tool schemas vary.

### 7.3 Multi-tenancy & context

If the server supports `profile`/`region`, prefer context injection:
- Backend can set `ToolCatalog.setContext({ profile, region, compartment })` per request.

## 8) Observability Standard (OCI APM)

### 8.1 Node/Backend

- `[Link to Secure Variable: OCI_APM_ENDPOINT]`
- `[Link to Secure Variable: OCI_APM_PRIVATE_DATA_KEY]`

Verify:
- `GET /api/observability/status`
- `POST /api/observability/otel/test`

### 8.2 Python MCP servers (if applicable)

Support OTEL env injection (names only):
- `[Link to Secure Variable: MCP_OTEL_SDK_DISABLED]`
- `[Link to Secure Variable: MCP_OTEL_TRACES_EXPORTER]`
- `[Link to Secure Variable: MCP_OTEL_ENDPOINT]`
- `[Link to Secure Variable: MCP_OTEL_HEADERS]`

## 9) Testing & Regression Standard

Minimum expectations for a new server:
- `ping` works and is stable
- `list_*` tools are deterministic
- `server://manifest` is implemented when possible

Repo-level checks:
- Use `GET /api/mcp/health` and `GET /api/health/full`
- Add/extend tests under `services/__tests__/` when client behavior changes

## 10) Operational Checklist (Before Shipping)

- [ ] Server ID + tool names follow conventions
- [ ] `ping` exists and is fast
- [ ] `server://manifest` is implemented (or explicitly documented as not supported)
- [ ] Tool schemas are stable + permissive
- [ ] No secrets in code/docs; placeholders only
- [ ] Cache behavior is explicit (Tier 1 cache tools vs Tier 2/3 API tools)
- [ ] Health is visible in `/api/health/full`

## 11) PR Checklist (Repo Standard)

Use this checklist in PR descriptions when you add or change an OCI MCP server.

**Identity & configuration**
- [ ] Server `id` is stable kebab-case and matches `data/mcp-servers-db.json`.
- [ ] Config uses env placeholders only (no hardcoded secrets/OCIDs): `[Link to Secure Variable: ...]`.
- [ ] If HTTP/SSE: URL is configured via an env var (e.g., `[Link to Secure Variable: MCP_EXAMPLE_HTTP_URL]`).
- [ ] If stdio: `command` is configured via env (e.g., `[Link to Secure Variable: SQLCL_PATH]`).

**Tools & schemas**
- [ ] `ping` exists and succeeds quickly (<1s).
- [ ] Tool names are consistent (snake_case or kebab-case) and verb-first.
- [ ] Input schemas are JSON schema objects and remain permissive across providers.
- [ ] Errors return structured JSON when possible: `{ success: false, error, suggestion }`.

**Manifest & tiering**
- [ ] `server://manifest` is implemented (or explicitly documented if not supported).
- [ ] Tools are categorized into tiers (1–4), especially cache tools.

**Caching & performance**
- [ ] Cache-first tools exist for common reads (`get_cached_*`, `list_cached_*`).
- [ ] Heavy tools accept time range params (`days_back`, `minutes_back`).
- [ ] Admin/destructive tools are explicit and safe by default.

**Integration & observability**
- [ ] `/api/mcp/health` shows the server as healthy when running.
- [ ] `/api/mcp/config/validate` has no issues for enabled servers.
- [ ] `/api/health/full` reflects the server correctly.
- [ ] OTEL env support is documented (names only) if the server emits traces.

**Agent wiring**
- [ ] Agent scoping is updated (if needed) in `services/server/agentFactory.ts`.
- [ ] Add wrapper “skills” (e.g., `db_*`) when schema instability is expected.

## 12) Scaffold Generator (Recommended)

This repo includes a generator to create a consistent starting point for a new MCP server integration.

Command:

```bash
npm run mcp:scaffold
```

Non-interactive usage:

```bash
npm run mcp:scaffold -- --id oci-mcp-example --name "OCI Example" --transport http --port 8010
```

Outputs (default):
- `tmp/mcp-server-scaffold/<id>/mcp-server.config.snippet.json` (paste into `data/mcp-servers-db.json`)
- `tmp/mcp-server-scaffold/<id>/server.manifest.json` (reference implementation for `server://manifest`)
- `tmp/mcp-server-scaffold/<id>/README.md` (next steps + troubleshooting links)

Notes:
- The generator uses env placeholders (no secrets). Define new env vars in `.env.example` using `[Link to Secure Variable: ...]`.
- Validate after adding your server:
  - `GET /api/mcp/config/validate`
  - `GET /api/mcp/health`
  - `GET /api/health/full`

## Related Files

- `data/mcp-servers-db.json`
- `services/mcpClient/ToolCatalog.ts`
- `services/mcpClient/DynamicMCPClient.ts`
- `services/utils/toolClassification.ts`
- `services/cache/MCPToolCache.ts`
- `routes/systemRoutes.ts`

Templates:
- `docs/templates/mcp-server-config.template.json`
- `docs/templates/server-manifest.template.json`
