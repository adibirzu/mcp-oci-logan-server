"""OCI Logging Analytics MCP Server — FastMCP v5.0.

Main entry point. Creates the FastMCP app, registers all tools/resources/prompts
via a lifespan that initializes the OCI client and detection catalog once.
"""

from __future__ import annotations

import json
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import Field

from mcp_logan import __version__
from mcp_logan.config import settings
from mcp_logan.core.observability import (
    Timer,
    configure_logging,
    get_logger,
    get_metrics,
    init_otel,
    record_call,
)

# Configure logging BEFORE any FastMCP import to avoid stdout pollution
configure_logging(level=settings.mcp_log_level)

from fastmcp import FastMCP  # noqa: E402 — must come after logging setup

log = get_logger("server")


# ------------------------------------------------------------------
# Lifespan — init OCI client + detection catalog once at startup
# ------------------------------------------------------------------

@asynccontextmanager
async def app_lifespan(server: FastMCP):
    """Initialize shared state, yield, then tear down."""
    from mcp_logan.core.client import LoganClient
    from mcp_logan.core.query_engine import QueryEngine
    from mcp_logan.detections.catalog import DetectionCatalog

    # Observability / OTEL
    init_otel()

    # Core
    query_engine = QueryEngine()
    client = LoganClient()
    try:
        client.initialize()
    except Exception as exc:
        log.error("client_init_failed", error=str(exc))
        # Continue — tools will return errors but server stays up

    # Detection catalog
    catalog = DetectionCatalog()
    try:
        catalog.initialize()
    except Exception as exc:
        log.error("catalog_init_failed", error=str(exc))

    # Register all modules
    from mcp_logan.prompts.security_workflows import register_security_prompts
    from mcp_logan.resources.detection_resources import register_detection_resources
    from mcp_logan.tools.analytics import register_analytics_tools
    from mcp_logan.tools.dashboard import register_dashboard_tools
    from mcp_logan.tools.detections import register_detection_tools
    from mcp_logan.tools.management import register_management_tools
    from mcp_logan.tools.query import register_query_tools

    register_query_tools(mcp, client, query_engine, catalog)
    register_management_tools(mcp, client, query_engine)
    register_analytics_tools(mcp, client, query_engine)
    register_dashboard_tools(mcp, client, query_engine)
    register_detection_tools(mcp, client, query_engine, catalog)
    register_detection_resources(mcp, catalog)
    register_security_prompts(mcp)
    _register_utility_tools(mcp, client, query_engine, catalog)

    catalog_status = (
        f"{catalog.rule_count} detection rules loaded"
        if catalog.is_loaded
        else "detection catalog not available"
    )
    log.info(
        "server_ready",
        version=__version__,
        transport=settings.mcp_transport,
        region=settings.region,
        catalog=catalog_status,
    )

    yield

    log.info("server_shutdown")


# ------------------------------------------------------------------
# FastMCP app
# ------------------------------------------------------------------

INSTRUCTIONS = """OCI Logging Analytics MCP Server v{version}

This server provides 39 tools for querying, managing, and analyzing
OCI Logging Analytics data, plus detection rules for threat hunting.

## Quick Start
- Use `oci_logan_health` to verify connectivity
- Use `oci_logan_execute_query` for ad-hoc OCL queries
- Use `oci_logan_search_detections` to find detection rules, then `oci_logan_run_detection` to execute them
- Read `detection://catalog` for a catalog overview
- Use prompts like `security-triage` or `threat-hunt` for guided workflows

## Tips
- Prefer detection-by-ID over raw OCL for lower token usage
- Default time range is 24h; use 7d+ for hunting queries
- Use format=json for programmatic consumption, markdown for chat
""".format(version=__version__)

mcp = FastMCP(
    name="OCI Log Analytics MCP Server",
    version=__version__,
    instructions=INSTRUCTIONS,
    lifespan=app_lifespan,
)


# ------------------------------------------------------------------
# Utility tools (registered directly on the mcp instance)
# ------------------------------------------------------------------

def _register_utility_tools(
    server: FastMCP, client: Any, query_engine: Any, catalog: Any,
) -> None:
    """Register 6 utility tools on the FastMCP app."""

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_health(
        detail: Annotated[bool, Field(description="Include extended diagnostics")] = False,
    ) -> str:
        """Check server health, OCI connectivity, and detection catalog status."""
        catalog.initialize()
        catalog_summary = catalog.get_summary()
        info: dict[str, Any] = {
            "status": "ok",
            "server": "oci_logan_mcp",
            "version": __version__,
            "transport": settings.mcp_transport,
            "region": settings.region,
            "defaultCompartment": settings.logan_compartment_id or "tenancy root (subtree=True)",
            "capabilities": ["tools", "resources", "prompts"],
            "ociSdk": True,
            "detectionCatalog": {
                "loaded": catalog_summary.get("loaded", False),
                "rules": catalog_summary.get("totalRules", 0),
                "hunting": catalog_summary.get("totalHunting", 0),
                "platforms": catalog_summary.get("platforms", {}),
            },
        }

        # Quick connection test (namespace not exposed for security)
        try:
            ns = client.namespace
            info["ociConnected"] = bool(ns)
            if not ns:
                info["status"] = "degraded"
                info["error"] = "OCI connection may have failed"
        except Exception as exc:
            info["status"] = "degraded"
            info["ociConnected"] = False
            info["error"] = str(exc)

        if detail:
            info["timestamp"] = datetime.now(timezone.utc).isoformat()
            info["pythonVersion"] = sys.version.split()[0]
            info["metrics"] = get_metrics()

        return json.dumps(info, indent=2, default=str)

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_validate_query(
        query: Annotated[str, Field(description="OCL query to validate")],
    ) -> str:
        """Validate and transform an OCL query without executing it."""
        original = query
        transformed = query_engine.transform(query)
        return json.dumps({
            "original": original,
            "transformed": transformed,
            "changed": original != transformed,
        }, indent=2)

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_queries(
        category: Annotated[str, Field(description="Category: security, audit, network, performance, all")] = "all",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get example OCL queries organized by category."""
        examples: dict[str, list[dict[str, str]]] = {
            "security": [
                {"name": "Failed Logins", "query": "'Event Type' like '%login%' and Status = 'Failure' | stats count as failures by 'Principal Name', 'Client Host' | sort -failures"},
                {"name": "Privilege Escalation", "query": "Severity in ('error', 'critical') and (Message like '%privilege%' or Message like '%sudo%') | stats count by 'Host Name'"},
                {"name": "Unusual Network", "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | stats count by SourceIP, DestinationPort | sort -count"},
            ],
            "audit": [
                {"name": "Resource Changes", "query": "'Request Action Type' in ('CreateInstance', 'DeleteBucket', 'UpdateSecurityList') | stats count by 'Request Action Type', 'Principal Name' | sort -count"},
                {"name": "Console Logins", "query": "'Event Type' like '%consolesignon%' | stats count by 'Principal Name', 'Client Host', Status"},
            ],
            "network": [
                {"name": "Top Talkers", "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats sum(Bytes) as totalBytes by SourceIP | sort -totalBytes | head 20"},
                {"name": "Blocked Traffic", "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action = 'REJECT' | stats count by SourceIP, DestinationIP, DestinationPort | sort -count"},
            ],
            "performance": [
                {"name": "Log Volume by Source", "query": "* | stats count as logrecords by 'Log Source' | sort -logrecords"},
                {"name": "Hourly Trend", "query": "* | timestats span=1h count as logrecords by 'Log Source'"},
            ],
        }

        if category != "all":
            examples = {category: examples.get(category, [])}

        if format == "json":
            return json.dumps(examples, indent=2)

        lines = ["**Example Queries**\n"]
        for cat, queries in examples.items():
            lines.append(f"\n### {cat.title()}\n")
            for q in queries:
                lines.append(f"**{q['name']}:**\n```\n{q['query']}\n```\n")
        return "\n".join(lines)

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_documentation(
        topic: Annotated[str, Field(description="Topic: ocl, tools, detections, resources, prompts, all")] = "all",
    ) -> str:
        """Get documentation for the MCP server capabilities."""
        docs: dict[str, str] = {
            "ocl": "Read the resource `detection://ocl/reference` for OCL query language syntax and patterns.",
            "tools": "39 tools across categories: query (4), management (11), analytics (5), dashboard (9), detections (4), utility (6). Use `oci_logan_health` to verify connectivity.",
            "detections": "200 detection rules organized by platform (oci/linux/windows), severity, and MITRE ATT&CK mapping. Browse with `detection://rules/summary`, search with `oci_logan_search_detections`, execute with `oci_logan_run_detection`.",
            "resources": "11 MCP resources under `detection://` — catalog summary, rules, hunting queries, MITRE coverage, STIG controls, and OCL reference. Use parameterized URIs like `detection://rules/{ruleId}`.",
            "prompts": "6 security workflow prompts: security-triage, threat-hunt, incident-investigation, compliance-check, detection-coverage-gap, daily-security-brief.",
        }

        if topic != "all":
            return docs.get(topic, f"Unknown topic: {topic}")
        return "\n\n".join(f"## {k.title()}\n{v}" for k, v in docs.items())

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_usage_guide(
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get the server usage guide with workflow recommendations."""
        guide = {
            "summary": f"OCI Logan MCP v{__version__} usage guide — tools + resources + prompts",
            "transports": {
                "preferred": "http",
                "fallback": "stdio",
                "env": {
                    "MCP_TRANSPORT": "http|streamable-http|stdio",
                    "MCP_HOST": "default 0.0.0.0",
                    "MCP_PORT": "default 8000",
                },
            },
            "detectionWorkflow": {
                "step1": "Browse: read detection://rules/summary or use oci_logan_search_detections",
                "step2": "Inspect: read detection://rules/{ruleId} for full details",
                "step3": "Execute: use oci_logan_run_detection with the rule ID",
                "step4": "Hunt: use oci_logan_run_hunting_query for advanced analytics",
                "tip": "Always use detection IDs instead of constructing raw OCL queries",
            },
            "prompts": [
                "security-triage — triage alerts across platforms",
                "threat-hunt — hypothesis-driven hunting session",
                "incident-investigation — IOC evidence collection",
                "compliance-check — STIG/DoD compliance report",
                "detection-coverage-gap — MITRE ATT&CK gap analysis",
                "daily-security-brief — daily SOC summary",
            ],
            "bestPractices": [
                "Prefer detection-by-ID over raw OCL queries for lower token usage",
                "Use cache-first where available; prefer concise queries",
                "Limit time ranges to reduce cost; default 24h unless specified",
                "Use 7d+ time ranges for hunting queries",
                "Return markdown for chat UIs, json for programmatic use",
            ],
        }
        if format == "json":
            return json.dumps(guide, indent=2)

        lines = [f"**{guide['summary']}**\n"]
        for k, v in guide.items():
            if k == "summary":
                continue
            if isinstance(v, list):
                lines.append(f"\n**{k}:**")
                for item in v:
                    lines.append(f"- {item}")
            elif isinstance(v, dict):
                lines.append(f"\n**{k}:**")
                for sk, sv in v.items():
                    lines.append(f"  **{sk}:** {sv}")
        return "\n".join(lines)

    @server.tool(annotations={"readOnlyHint": True})
    async def oci_logan_check_connection() -> str:
        """Test OCI Logging Analytics connectivity."""
        result = client.test_connection()
        return json.dumps(result, indent=2, default=str)


# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------

def main() -> None:
    """Run the MCP server."""
    transport = settings.mcp_transport.lower()

    if transport in ("http", "streamable-http"):
        mcp.run(
            transport="streamable-http",
            host=settings.mcp_host,
            port=settings.mcp_port,
        )
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
