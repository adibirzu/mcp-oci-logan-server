# OCI Logan MCP Server - Repository Guidelines

## Overview

This repository contains the OCI Logging Analytics MCP Server, providing intelligent log analysis, security auditing, and alert correlation capabilities via the Model Context Protocol.

## Project Structure

```
mcp-oci-logan-server/
├── src/mcp_logan/              # Canonical FastMCP implementation
│   ├── server.py               # Canonical server entry point
│   ├── config.py               # Runtime configuration and content-path validation
│   ├── core/                   # OCI client, query engine, observability
│   ├── tools/                  # Query, management, analytics, dashboard, detections
│   ├── detections/             # Detection catalog loader
│   ├── resources/              # detection:// resources
│   └── prompts/                # Guided security workflows
├── python/                     # Legacy compatibility/older implementations
│   ├── main.py
│   ├── fastmcp_server.py
│   └── ...
├── src/                        # Legacy TypeScript implementation and assets
├── docs/                       # Documentation
├── tests/                      # Test files
└── wiki/                       # Wiki documentation
```

## Primary Implementation

**Use the FastMCP app in `src/mcp_logan/server.py` as the canonical implementation.**

This is the production contract for the repo:
- Real OCI Log Analytics data only
- No mock/sample Logan responses in the canonical server path
- Detection and hunting content loaded from `DETECTION_RULES_PATH`
- `oci-log-analytics-detections` is the canonical external content source

Treat `python/` and the legacy `src/` TypeScript path as historical compatibility surfaces unless the current task explicitly targets them.

## Development Commands

```bash
# Setup
pip install -e .

# Run the canonical server (stdio mode)
python -m src.mcp_logan.server

# Run canonical server over HTTP
MCP_TRANSPORT=http python -m src.mcp_logan.server

# Legacy servers only if explicitly needed
cd python && python main.py
cd python && python fastmcp_server.py
```

## Canonical Tool Surface

The canonical server currently exposes:

- 6 query tools
- 12 management tools
- 5 analytics tools
- 10 dashboard tools
- 5 detection tools
- 6 utility tools

Total:

- 44 tools

## Environment Variables

```bash
# Typical
LOGAN_COMPARTMENT_ID=[Link to Secure Variable: LOGAN_COMPARTMENT_ID]
LOGAN_REGION=us-ashburn-1
DETECTION_RULES_PATH=~/dev/oci-log-analytics-detections/queries

# Optional
OCI_CONFIG_FILE=~/.oci/config
OCI_PROFILE=default
LOGAN_DEBUG=true
MCP_TRANSPORT=stdio
```

## Coding Standards

- Python 3.9+ with type hints
- Use `asyncio.to_thread()` for blocking OCI calls
- No stdout logging (stderr only for MCP compatibility)
- Tools use snake_case naming
- Do not add mock/sample fallbacks to canonical Logan tool paths
- Keep Logan vs OCI Logging Search semantics explicit

## Testing

```bash
# Unit/integration tests
python -m pytest tests/

# Quick real-data validation
python -m src.mcp_logan.server
```

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Test changes with real OCI credentials when possible
- Update SKILLS_GUIDE.md when adding new tools/skills

## Canonical Health Checks

Use:

- `oci_logan_health`
- `oci_logan_check_connection`

`oci_logan_health` should be treated as the first validation step because it reports:

- OCI connectivity
- canonical detection catalog path
- detection catalog load state
