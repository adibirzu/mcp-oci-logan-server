"""MCP resources for detection catalog + OCL reference (6 static + 5 templates)."""

from __future__ import annotations

import json
from typing import Any

from mcp_logan.core.observability import get_logger

log = get_logger("resources.detections")

# ------------------------------------------------------------------
# OCL Quick Reference (static content)
# ------------------------------------------------------------------

OCL_REFERENCE = """# OCL Query Language Quick Reference

## Query Structure

OCL queries use pipe-delimited commands:
```
<filter_expression> | <command1> | <command2> | ...
```

## Filter Expressions

### Log Source Selection
```
'Log Source' = 'OCI Audit Logs'
'Log Source' = 'SOC Linux Syslog Logs'
'Log Source' = 'SOC Windows Sysmon Logs'
'Log Source' = 'SOC Cloud Guard Logs'
```

### Field Quoting Rules
- Fields with spaces MUST be single-quoted: `'Log Source'`, `'Host Name'`, `'Event Type'`
- Fields without spaces may be unquoted: `Status`, `Severity`, `User`
- String values use single quotes: `Status = 'Failure'`

### Comparison Operators
```
=, !=, >, <, >=, <=
like '*pattern*'     -- wildcard match
not like '*pattern*'
in ('val1', 'val2')  -- set membership
REGEX MATCH 'pattern' -- regex match
```

### Boolean Logic
```
and, or, not
(condition1 or condition2) and condition3
```

## Common Commands

### stats — Aggregate statistics
```
| stats count by 'Log Source'
| stats count as events, avg(Size) as avg_size by 'Host Name'
| stats distinct_count('User') as unique_users by 'Client Host'
| stats sum(Size), min(Size), max(Size) by 'Log Source'
```

### timestats — Time-bucketed statistics
```
| timestats count by 'Log Source'
| timestats count as logrecords by 'Log Source'
| timestats span=1h count by Severity
```

### eval — Computed fields
```
| eval risk_score = if(Severity = 'ERROR', 10, 1)
| eval is_admin = contains('Principal Name', 'admin')
```

### where — Post-aggregation filter
```
| stats count as events by 'Host Name' | where events > 100
```

### sort — Order results
```
| sort -count           -- descending
| sort +Time            -- ascending
| sort -events, +'Host Name'
```

### head / tail — Limit results
```
| head 20   -- first 20 results
| tail 10   -- last 10 results
```

### fields — Select/project fields
```
| fields 'Host Name', 'Log Source', Severity, Time
```

### extract — Regex field extraction
```
| extract field=Message 'user=(?P<username>\\w+)'
```

### cluster — Log clustering
```
| cluster maxclusters=10 t=0.8 field=Message
```

### link — Entity relationship graph
```
| link 'Source IP', 'Destination IP'
```

### outlier — Anomaly detection
```
| outlier threshold=2
```

### rename — Rename fields
```
| rename 'Host Name' as hostname
```

## Time Filters

### Relative time (recommended for most queries)
These are applied automatically by the server's timeRange parameter.
Manual usage:
```
Time >= '2024-01-01T00:00:00Z' and Time <= '2024-01-02T00:00:00Z'
```

### dateRelative function
```
dateRelative(now, -24h)
dateRelative(now, -7d)
dateRelative(now, -30d)
```

## Common Detection Patterns

### Frequency Analysis (Brute Force)
```
'Log Source' = '<source>' and <failure_condition>
| stats count as failed by '<entity>'
| where failed > <threshold>
| sort -failed
```

### Rare Value Stacking
```
'Log Source' = '<source>'
| stats count by '<field>'
| where count < <threshold>
| sort count
```

### Anomaly Scoring (Multi-indicator)
```
'Log Source' = '<source>' and (<indicator1> or <indicator2> or ...)
| stats count as total, distinct_count('<indicator_field>') as indicators by '<entity>'
| where indicators >= <threshold>
| sort -indicators
```

### Temporal Analysis
```
'Log Source' = '<source>'
| timestats count by '<entity>'
| eval hourOfDay = hour(Time)
| where hourOfDay < 6 or hourOfDay > 22
```

## OCI Audit Log Fields (verified against live API)

| Field | Description |
|-------|-------------|
| 'Event Type' | OCI API operation (e.g., com.oraclecloud.consolesignon.login) |
| 'User Name' | User or service principal (NOT 'Principal Name') |
| Status | HTTP status code (200, 201, 400, etc.) — unquoted |
| 'Source IP' | Source IP address (NOT 'Client Host') |
| 'IP Address' | Alternative IP field |
| 'Compartment Name' | OCI compartment |
| 'Resource Name' | Affected resource |
| 'Resource Type' | Resource type |

## Linux Syslog Fields

| Field | Description |
|-------|-------------|
| msg | Syslog message content |
| 'Source IP' | Source IP |
| User | Username |
| 'Host Name' | Host name |
| 'Process Name' | Process that generated the log |

## Windows Sysmon Fields (verified against live API)

| Field | Description |
|-------|-------------|
| 'Process Name' | Executable path (NOT Image — unquoted is INVALID) |
| 'Command Line' | Full command line (NOT CommandLine — unquoted is INVALID) |
| 'User' | Account name |
| 'User Name' | Account name (alternative) |
| 'Host Name' | Computer/host name |
| 'Destination IP' | Network destination (NOT DestinationIp) |
| 'Source IP' | Source IP (NOT SourceIp) |
| 'Query Name' | DNS query name for Event ID 22 (NOT QueryName) |
| Technique_id | MITRE technique ID — unquoted |
| 'Event ID' | Sysmon event type (1=process, 3=network, 11=file, 22=DNS) |

## VCN Flow Log Fields (verified against live API)

| Field | Description |
|-------|-------------|
| Action | accept / drop / reject — unquoted |
| 'Source IP' | Source IP (MUST be quoted — SourceIP is INVALID) |
| 'Source Port' | Source port (MUST be quoted) |
| 'Destination IP' | Destination IP (MUST be quoted — DestinationIP is INVALID) |
| 'Destination Port' | Destination port (MUST be quoted) |
| 'Protocol Number' | Protocol number |

## Cloud Guard Fields

| Field | Description |
|-------|-------------|
| 'Problem Type' | Detection problem type |
| 'Risk Level' | CRITICAL / HIGH / MEDIUM / LOW |
| 'Resource Name' | Affected resource |
| 'Resource Type' | Resource type |
| 'Detector' | Detector rule name |
| 'Recommendation' | Remediation recommendation |

## IMPORTANT: Field Naming Rules (verified against live API 2026-03-19)

1. **ALL fields with spaces MUST be single-quoted**: `'Source IP'` not `SourceIP`
2. **Unquoted CamelCase is INVALID**: `SourceIP`, `CommandLine`, `QueryName` all return HTTP 400
3. **Audit uses 'User Name'** — `'Principal Name'` and `'Client Host'` are INVALID
4. **Sysmon uses 'Process Name'** — `Image` (unquoted) is INVALID
5. **Sysmon uses 'Command Line'** — `CommandLine` (unquoted) is INVALID
6. **Use `distinctcount()`** — `distinct_count()` is INVALID (no underscore)
7. **Null checks**: Use `!= ""` not `!= null` or `is not null`
"""

PLATFORMS = ("oci", "linux", "windows")
DETECTION_LEVELS = ("critical", "high", "medium", "low", "informational")


def register_detection_resources(mcp: Any, catalog: Any) -> None:
    """Register detection-related MCP resources on the FastMCP app."""

    # ------------------------------------------------------------------
    # 6 Static resources
    # ------------------------------------------------------------------

    @mcp.resource("detection://catalog", name="Detection Catalog Summary",
                   description="Overview of the detection catalog: platforms, severities, MITRE coverage stats",
                   mime_type="application/json")
    async def catalog_summary() -> str:
        catalog.initialize()
        return json.dumps(catalog.get_summary(), indent=2, default=str)

    @mcp.resource("detection://rules/summary", name="Detection Rules Summary",
                   description="Compact list of all detection rules (id, title, level, platform)",
                   mime_type="application/json")
    async def rules_summary() -> str:
        catalog.initialize()
        return json.dumps(catalog.list_rules_compact(), indent=2, default=str)

    @mcp.resource("detection://hunting/summary", name="Hunting Queries Summary",
                   description="Compact list of all hunting queries (id, title, level, platform)",
                   mime_type="application/json")
    async def hunting_summary() -> str:
        catalog.initialize()
        return json.dumps(catalog.list_hunting_compact(), indent=2, default=str)

    @mcp.resource("detection://mitre/coverage", name="MITRE ATT&CK Coverage",
                   description="MITRE ATT&CK technique coverage matrix grouped by tactic",
                   mime_type="application/json")
    async def mitre_coverage() -> str:
        catalog.initialize()
        return json.dumps(catalog.get_mitre_coverage(), indent=2, default=str)

    @mcp.resource("detection://stig/controls", name="STIG Compliance Controls",
                   description="STIG/DoD compliance control mapping with associated detection rules",
                   mime_type="application/json")
    async def stig_controls() -> str:
        catalog.initialize()
        return json.dumps(catalog.get_stig_controls(), indent=2, default=str)

    @mcp.resource("detection://ocl/reference", name="OCL Query Language Reference",
                   description="Quick reference for OCI Log Analytics query language syntax, commands, and patterns",
                   mime_type="text/markdown")
    async def ocl_reference() -> str:
        return OCL_REFERENCE

    # ------------------------------------------------------------------
    # 5 Resource templates
    # ------------------------------------------------------------------

    @mcp.resource("detection://rules/{rule_id}", name="Detection Rule",
                   description="Full detection rule with query, MITRE mapping, false positives",
                   mime_type="application/json")
    async def rule_detail(rule_id: str) -> str:
        catalog.initialize()

        # Check if rule_id is actually a platform or level filter
        if rule_id in PLATFORMS:
            return json.dumps(catalog.search_rules(platform=rule_id), indent=2, default=str)
        if rule_id in DETECTION_LEVELS:
            return json.dumps(catalog.search_rules(level=rule_id), indent=2, default=str)

        rule = catalog.get_rule(rule_id)
        if not rule:
            return json.dumps({"error": f"Detection rule not found: {rule_id}"})
        return json.dumps(rule, indent=2, default=str)

    @mcp.resource("detection://hunting/{query_id}", name="Hunting Query",
                   description="Full hunting query with methodology, query, and MITRE mapping",
                   mime_type="application/json")
    async def hunting_detail(query_id: str) -> str:
        catalog.initialize()
        query = catalog.get_hunting_query(query_id)
        if not query:
            return json.dumps({"error": f"Hunting query not found: {query_id}"})
        return json.dumps(query, indent=2, default=str)

    @mcp.resource("detection://rules/platform/{platform}", name="Rules by Platform",
                   description="Detection rules filtered by platform (oci, linux, windows)",
                   mime_type="application/json")
    async def rules_by_platform(platform: str) -> str:
        catalog.initialize()
        return json.dumps(catalog.search_rules(platform=platform), indent=2, default=str)

    @mcp.resource("detection://rules/level/{level}", name="Rules by Severity",
                   description="Detection rules filtered by severity level",
                   mime_type="application/json")
    async def rules_by_level(level: str) -> str:
        catalog.initialize()
        return json.dumps(catalog.search_rules(level=level), indent=2, default=str)

    @mcp.resource("detection://rules/mitre/{technique_id}", name="Rules by MITRE Technique",
                   description="Detection rules covering a specific MITRE ATT&CK technique (e.g. T1078)",
                   mime_type="application/json")
    async def rules_by_mitre(technique_id: str) -> str:
        catalog.initialize()
        return json.dumps(
            catalog.search_rules(mitre_technique=technique_id.upper()),
            indent=2,
            default=str,
        )
