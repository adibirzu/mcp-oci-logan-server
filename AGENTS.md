# OCI Logan MCP Server - Repository Guidelines

## Overview

This repository contains the OCI Logging Analytics MCP Server, providing intelligent log analysis, security auditing, and alert correlation capabilities via the Model Context Protocol.

## Project Structure

```
mcp-oci-logan-server/
├── python/                     # Python FastMCP server (PRIMARY)
│   ├── main.py                 # Enhanced MCP server entry point
│   ├── logan_client.py         # OCI Log Analytics API client
│   ├── query_mapper.py         # Security query mappings
│   ├── query_validator.py      # Query validation
│   ├── security_analyzer.py    # Security analysis utilities
│   ├── dashboard_client.py     # Dashboard operations
│   ├── fastmcp_server.py       # Legacy minimal server (deprecated)
│   ├── requirements.txt        # Python dependencies
│   ├── SKILLS_GUIDE.md         # Skills documentation
│   └── skills/                 # Composable skills layer
│       ├── __init__.py
│       ├── adapters.py         # Client adapters
│       ├── log_analysis.py     # LogAnalysisSkill
│       ├── security_audit.py   # SecurityAuditSkill
│       └── alert_correlation.py # AlertCorrelationSkill
├── src/                        # TypeScript implementation (secondary)
│   ├── index.ts
│   ├── oci/                    # OCI client
│   ├── tools/                  # Tool definitions
│   └── ...
├── docs/                       # Documentation
├── tests/                      # Test files
└── wiki/                       # Wiki documentation
```

## Primary Implementation

**Use the Python FastMCP server (`python/main.py`)** as the primary implementation. It provides:
- 25+ MCP tools organized by skill
- Server manifest resource for capability discovery
- Tiered tool organization (Tier 1: instant, Tier 2: API)
- Three composable skills: LogAnalysis, SecurityAudit, AlertCorrelation

## Development Commands

```bash
# Setup
pip install -r python/requirements.txt

# Run the server (stdio mode)
cd python && python main.py

# Run legacy server (deprecated)
cd python && python fastmcp_server.py

# Run TypeScript server
npm install && npm start
```

## Available Skills

### LogAnalysisSkill
- Log search and aggregation
- Source discovery
- Trend analysis
- Pattern detection

### SecurityAuditSkill  
- Security event detection
- Failed login detection
- Privilege escalation monitoring
- Compliance assessment

### AlertCorrelationSkill
- Alert grouping and deduplication
- Root cause analysis
- Incident timeline building
- Priority classification

## Tool Tiers

### Tier 1 (Instant - Management API)
- `health()`, `list_log_sources()`, `get_log_source_summary()`
- `list_security_check_types()`, `list_correlation_patterns()`
- Zero query cost, instant response

### Tier 2 (Query API)
- `search_logs()`, `aggregate_logs()`, `get_log_trends()`
- `run_security_check()`, `get_threat_summary()`
- `correlate_alerts()`, `analyze_root_cause()`
- Requires OCI API calls, 1-30 second response

## Environment Variables

```bash
# Required
LOGAN_COMPARTMENT_ID=ocid1.compartment...
LOGAN_REGION=us-ashburn-1

# Optional
OCI_CONFIG_FILE=~/.oci/config
LOGAN_DEBUG=true
```

## Coding Standards

- Python 3.9+ with type hints
- Use `asyncio.to_thread()` for blocking OCI calls
- No stdout logging (stderr only for MCP compatibility)
- Follow skillz pattern for composable skills
- Tools use snake_case naming

## Testing

```bash
# Test skills (mock mode)
cd python && python -m pytest tests/

# Test with real OCI
LOGAN_DEBUG=true python -c "from skills import LogAnalysisSkill; s = LogAnalysisSkill(); print(s.list_log_sources())"
```

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Test changes with real OCI credentials when possible
- Update SKILLS_GUIDE.md when adding new tools/skills

## Server Manifest

Access capability discovery via:
```python
# Resource URI
server://manifest
```

Returns server version, available skills, tool categorization, and usage guide.
