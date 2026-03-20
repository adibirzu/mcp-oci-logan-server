"""Query execution tools (4 tools)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from pydantic import Field

from mcp_logan.core.observability import Timer, get_logger, record_call

log = get_logger("tools.query")


def register_query_tools(mcp: Any, client: Any, query_engine: Any, catalog: Any = None) -> None:
    """Register query execution tools on the FastMCP app."""

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_execute_query(
        query: Annotated[str, Field(description="OCI Logging Analytics query (pipe-delimited OCL)")],
        timeRange: Annotated[str, Field(description="Time range: 1h, 6h, 24h, 7d, 30d")] = "24h",
        limit: Annotated[int, Field(ge=1, le=10000, description="Max results")] = 100,
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output: markdown or json")] = "markdown",
    ) -> str:
        """Execute an OCI Logging Analytics query with enhanced query language support."""
        time_minutes = query_engine.parse_time_range(timeRange)

        with Timer() as t:
            results = client.execute_query(query, time_minutes, limit)

        record_call("oci_logan_execute_query", t.duration_ms, error=not results.get("success", False))

        if not results.get("success"):
            return _error_response(results.get("error", "Query execution failed"), format)

        return _format_query_result("OCI Log Query Results", results, timeRange, time_minutes, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_search_security_events(
        searchTerm: Annotated[str, Field(description="Search term or pattern for security events")],
        eventType: Annotated[str, Field(description="Event type filter")] = "all",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 20,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Search for security events using detection rules or predefined patterns."""
        query = None
        detection_source = None

        # Try detection catalog first — maps event types to curated detection rules
        if catalog:
            catalog.initialize()
            _event_type_keywords: dict[str, str] = {
                "login": "login",
                "privilege_escalation": "privilege escalation",
                "privilege-escalation": "privilege escalation",
                "network_anomaly": "network anomaly",
                "data_exfiltration": "exfiltration",
                "malware": "malware",
                "brute_force": "brute force",
                "lateral_movement": "lateral movement",
            }
            keyword = _event_type_keywords.get(eventType, searchTerm)
            matches = catalog.search_rules(keyword=keyword)
            if matches:
                best = matches[0]
                rule_query = best.get("query", "")
                if rule_query:
                    query = rule_query
                    detection_source = best.get("id", "catalog")
                    log.info("security_event_from_catalog", rule_id=detection_source, keyword=keyword)

        # Fallback to hardcoded event queries
        if not query:
            event_queries = {
                "login": f"'Event Type' like '%login%' or 'Event Type' like '%signon%' | where Message like '%{searchTerm}%'",
                "privilege_escalation": f"Severity in ('error', 'critical') and (Message like '%privilege%' or Message like '%sudo%' or Message like '%{searchTerm}%')",
                "privilege-escalation": f"Severity in ('error', 'critical') and (Message like '%privilege%' or Message like '%sudo%' or Message like '%{searchTerm}%')",
                "network_anomaly": f"'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | where Message like '%{searchTerm}%'",
                "data_exfiltration": f"Message like '%{searchTerm}%' | stats count as events by 'Host Name', 'Log Source'",
                "malware": f"Message like '%{searchTerm}%' and Severity in ('error', 'critical')",
            }

            if eventType != "all" and eventType in event_queries:
                query = event_queries[eventType]
            else:
                query = f"Message like '%{searchTerm}%' | stats count as events by 'Log Source', Severity | sort -events"

        query += f" | head {limit}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(query, time_minutes, limit)

        if not results.get("success"):
            return _error_response(results.get("error", "Security event search failed"), format)

        title = "Security Events Search"
        if detection_source:
            title += f" (via detection: {detection_source})"
        return _format_query_result(title, results, timeRange, time_minutes, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_mitre_techniques(
        techniqueId: Annotated[str, Field(description="MITRE technique ID (e.g., T1003) or 'all'")] = "all",
        category: Annotated[str, Field(description="MITRE tactic category")] = "all",
        timeRange: Annotated[str, Field(description="Time range (Sysmon defaults to 30d)")] = "30d",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Search for MITRE ATT&CK techniques in the logs."""
        end = datetime.now(timezone.utc)
        time_minutes = query_engine.parse_time_range(timeRange)
        start = end - timedelta(minutes=time_minutes)
        time_filter = f"and Time >= '{start.isoformat()}' and Time <= '{end.isoformat()}'"

        if techniqueId and techniqueId != "all":
            query = f"'Log Source' = 'Windows Sysmon Events' and Technique_id = '{techniqueId}' {time_filter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'"
        else:
            query = f"'Log Source' = 'Windows Sysmon Events' and Technique_id != '' {time_filter} | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'"

        results = client.execute_query(query, time_minutes, 100, bypass_transform=True)

        if not results.get("success"):
            return _error_response(results.get("error", "MITRE analysis failed"), format)

        return _format_query_result("MITRE ATT&CK Analysis", results, timeRange, time_minutes, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_analyze_ip_activity(
        ipAddress: Annotated[str, Field(description="IP address to analyze (IPv4 or IPv6)")],
        analysisType: Annotated[str, Field(description="Analysis type: full, authentication, network")] = "full",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Analyze activity for a specific IP address across all log sources."""
        time_minutes = query_engine.parse_time_range(timeRange)
        all_results = []

        queries = [
            ("authentication", f"'Client Host' = '{ipAddress}' or SourceIP = '{ipAddress}' | stats count as events by 'Event Type', Status | sort -events | head 20"),
            ("network", f"(SourceIP = '{ipAddress}' or DestinationIP = '{ipAddress}') | stats count as events by Action, DestinationPort | sort -events | head 20"),
            ("log_sources", f"('Client Host' = '{ipAddress}' or SourceIP = '{ipAddress}') | stats count as events by 'Log Source' | sort -events"),
        ]

        if analysisType != "full":
            queries = [q for q in queries if q[0] == analysisType]

        for qtype, query in queries:
            result = client.execute_query(query, time_minutes, 50)
            all_results.append({
                "type": qtype,
                "count": result.get("total_count", 0),
                "data": result.get("results", [])[:10],
            })

        total_events = sum(r["count"] for r in all_results)

        data = {"ipAddress": ipAddress, "analysisType": analysisType, "timeRange": timeRange, "totalEvents": total_events, "analyses": all_results}

        if format == "json":
            return json.dumps(data, indent=2)
        return _to_markdown("IP Activity Analysis", data)


# ------------------------------------------------------------------
# Formatting helpers
# ------------------------------------------------------------------

def _error_response(error: str, fmt: str) -> str:
    if fmt == "json":
        return json.dumps({"error": error, "success": False}, indent=2)
    return f"**Error:** {error}"


def _format_query_result(title: str, results: dict[str, Any], time_range: str, time_minutes: int, fmt: str) -> str:
    data = {
        "timeRange": time_range,
        "totalRecords": results.get("total_count", 0),
        "executionTime": f"{results.get('execution_time', 0)}ms",
        "results": results.get("results", [])[:50],
    }
    if fmt == "json":
        return json.dumps(data, indent=2)
    return _to_markdown(title, data)


def _to_markdown(title: str, data: dict[str, Any]) -> str:
    lines = [f"**{title}**\n"]
    for key, value in data.items():
        if key == "results" and isinstance(value, list):
            lines.append(f"\n**Results** ({len(value)} rows):\n```json\n{json.dumps(value, indent=2, default=str)}\n```")
        elif key == "analyses" and isinstance(value, list):
            for analysis in value:
                lines.append(f"\n**{analysis.get('type', '')}** ({analysis.get('count', 0)} events):")
                if analysis.get("data"):
                    lines.append(f"```json\n{json.dumps(analysis['data'], indent=2, default=str)}\n```")
        elif isinstance(value, (dict, list)):
            lines.append(f"**{key}:**\n```json\n{json.dumps(value, indent=2, default=str)}\n```")
        else:
            lines.append(f"**{key}:** {value}")
    return "\n".join(lines)
