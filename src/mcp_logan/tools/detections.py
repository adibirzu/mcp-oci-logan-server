"""Detection catalog tools (5 tools)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from pydantic import Field

from mcp_logan.core.field_registry import FieldRegistry
from mcp_logan.core.observability import get_logger

log = get_logger("tools.detections")

field_registry = FieldRegistry()


def register_detection_tools(
    mcp: Any, client: Any, query_engine: Any, catalog: Any,
) -> None:
    """Register detection catalog tools on the FastMCP app."""

    def _time_filter(time_range: str) -> str:
        now = datetime.now(timezone.utc)
        mins = query_engine.parse_time_range(time_range)
        start = now - timedelta(minutes=mins)
        return f"and Time >= '{start.isoformat()}' and Time <= '{now.isoformat()}'"

    def _inject_time(query: str, time_range: str) -> str:
        """Inject time filter into a query if not already present."""
        if "Time >" in query or "Time >=" in query or "dateRelative" in query:
            return query
        tf = _time_filter(time_range)
        pipe_idx = query.find("|")
        if pipe_idx > 0:
            return f"{query[:pipe_idx].strip()} {tf} {query[pipe_idx:]}"
        return f"{query} {tf}"

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_run_detection(
        ruleId: Annotated[str, Field(description="Detection rule ID from the catalog")],
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Run a detection rule from the catalog against live log data."""
        catalog.initialize()

        rule = catalog.get_rule(ruleId)
        if not rule:
            return _error(f"Detection rule not found: {ruleId}", format)

        query = rule.get("query", "")
        if not query:
            return _error(f"Detection rule '{ruleId}' has no query field", format)

        # Validate and fix field names against the log source
        log_source = _extract_log_source(query)
        if log_source:
            query = field_registry.fix_fields(query, log_source)

        query = _inject_time(query, timeRange)

        log.info("run_detection", rule_id=ruleId, title=rule.get("title", ""))

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(query, time_minutes, 100, bypass_transform=True)

        # If zero results and rule has a log source, try aliases
        if results.get("total_count", 0) == 0:
            log_source = _extract_log_source(query)
            if log_source:
                aliases = query_engine.get_log_source_aliases(log_source)
                for alias in aliases:
                    if alias == log_source:
                        continue
                    alt_query = query.replace(log_source, alias)
                    log.info("retry_with_alias", original=log_source, alias=alias)
                    results = client.execute_query(alt_query, time_minutes, 100, bypass_transform=True)
                    if results.get("total_count", 0) > 0:
                        break

        data = {
            "ruleId": ruleId,
            "title": rule.get("title", ""),
            "level": rule.get("level", ""),
            "description": rule.get("description", ""),
            "mitre": rule.get("mitre_attack", {}),
            "timeRange": timeRange,
            "totalRecords": results.get("total_count", 0),
            "executionTime": f"{results.get('execution_time', 0)}ms",
            "falsepositives": rule.get("falsepositives", []),
            "results": results.get("results", [])[:50],
        }
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Detection Rule Results", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_run_hunting_query(
        queryId: Annotated[str, Field(description="Hunting query ID from the catalog")],
        timeRange: Annotated[str, Field(description="Time range")] = "7d",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Run a hunting query from the catalog against live log data."""
        catalog.initialize()

        hunting = catalog.get_hunting_query(queryId)
        if not hunting:
            return _error(f"Hunting query not found: {queryId}", format)

        query = hunting.get("query", "")
        if not query:
            return _error(f"Hunting query '{queryId}' has no query field", format)

        query = _inject_time(query, timeRange)

        log.info("run_hunting_query", query_id=queryId, title=hunting.get("title", ""))

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(query, time_minutes, 100, bypass_transform=True)

        data = {
            "queryId": queryId,
            "title": hunting.get("title", ""),
            "huntingType": hunting.get("hunting_type", ""),
            "cookbookMethod": hunting.get("cookbook_method", ""),
            "level": hunting.get("level", ""),
            "description": hunting.get("description", ""),
            "mitre": hunting.get("mitre_attack", {}),
            "timeRange": timeRange,
            "totalRecords": results.get("total_count", 0),
            "executionTime": f"{results.get('execution_time', 0)}ms",
            "results": results.get("results", [])[:50],
        }
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Hunting Query Results", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_search_detections(
        platform: Annotated[str, Field(description="Platform: oci, linux, windows, all")] = "",
        level: Annotated[str, Field(description="Severity: critical, high, medium, low")] = "",
        mitreTechnique: Annotated[str, Field(description="MITRE technique (e.g. T1078)")] = "",
        mitreTactic: Annotated[str, Field(description="MITRE tactic (e.g. initial-access)")] = "",
        stigCategory: Annotated[str, Field(description="STIG category")] = "",
        keyword: Annotated[str, Field(description="Keyword search in title/description")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Search detection rules by platform, severity, MITRE technique, or keyword."""
        catalog.initialize()

        results = catalog.search_rules(
            platform=platform or None,
            level=level or None,
            mitre_technique=mitreTechnique.upper() if mitreTechnique else None,
            mitre_tactic=mitreTactic or None,
            stig_category=stigCategory or None,
            keyword=keyword or None,
        )

        filters = {}
        if platform:
            filters["platform"] = platform
        if level:
            filters["level"] = level
        if mitreTechnique:
            filters["mitreTechnique"] = mitreTechnique
        if mitreTactic:
            filters["mitreTactic"] = mitreTactic
        if stigCategory:
            filters["stigCategory"] = stigCategory
        if keyword:
            filters["keyword"] = keyword

        data = {
            "filters": filters,
            "totalMatches": len(results),
            "hint": "Use ruleId with oci_logan_run_detection to execute, or read detection://rules/{ruleId} for full details",
            "results": results,
        }
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Detection Search Results", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_detection_stats(
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get detection catalog statistics: rule counts, platforms, MITRE coverage."""
        catalog.initialize()
        stats = catalog.get_stats()
        return json.dumps(stats, indent=2, default=str) if format == "json" else _md("Detection Catalog Statistics", stats)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_test_detection(
        ruleId: Annotated[str, Field(description="Detection rule ID to test")],
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Test a detection rule: validate fields, check query syntax, run against live data, and report issues."""
        catalog.initialize()

        rule = catalog.get_rule(ruleId)
        if not rule:
            return _error(f"Detection rule not found: {ruleId}", format)

        query = rule.get("query", "")
        if not query:
            return _error(f"Detection rule '{ruleId}' has no query field", format)

        issues: list[str] = []
        fixes_applied: list[str] = []

        # 1. Validate field names against log source
        log_source = _extract_log_source(query)
        if log_source:
            warnings = field_registry.validate_fields(query, log_source)
            issues.extend(warnings)
            fixed_query = field_registry.fix_fields(query, log_source)
            if fixed_query != query:
                fixes_applied.append(f"Fixed field names for '{log_source}'")
                query = fixed_query
        else:
            issues.append("No log source detected in query — cannot validate fields")

        # 2. Check for known syntax issues
        if "!= null" in query:
            issues.append("Uses '!= null' — should be '!= \"\"' for OCI API")
        if "is not null" in query:
            issues.append("Uses 'is not null' — should be '!= \"\"' for OCI API")

        # 3. Execute against live data
        query_with_time = _inject_time(query, timeRange)
        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(query_with_time, time_minutes, 10, bypass_transform=True)

        execution_ok = results.get("success", False)
        total_count = results.get("total_count", 0)

        if not execution_ok:
            issues.append(f"Query execution failed: {results.get('error', 'unknown')}")

        # 4. Try aliases if zero results
        alias_tried = []
        if total_count == 0 and log_source:
            aliases = query_engine.get_log_source_aliases(log_source)
            for alias in aliases:
                if alias == log_source:
                    continue
                alias_tried.append(alias)
                alt_query = _inject_time(query.replace(log_source, alias), timeRange)
                alt_results = client.execute_query(alt_query, time_minutes, 10, bypass_transform=True)
                if alt_results.get("total_count", 0) > 0:
                    fixes_applied.append(f"Log source alias '{alias}' returned results")
                    total_count = alt_results.get("total_count", 0)
                    break

        data = {
            "ruleId": ruleId,
            "title": rule.get("title", ""),
            "level": rule.get("level", ""),
            "logSource": log_source or "unknown",
            "timeRange": timeRange,
            "queryValid": execution_ok,
            "totalRecords": total_count,
            "issues": issues,
            "fixesApplied": fixes_applied,
            "aliasesTried": alias_tried,
            "verdict": "PASS" if execution_ok and not issues else "WARN" if execution_ok else "FAIL",
        }
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Detection Rule Test", data)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _extract_log_source(query: str) -> str:
    """Extract log source name from a query like "'Log Source' = 'Name'"."""
    import re
    m = re.search(r"'Log Source'\s*=\s*'([^']+)'", query)
    return m.group(1) if m else ""


def _error(msg: str, fmt: str) -> str:
    if fmt == "json":
        return json.dumps({"error": msg, "success": False}, indent=2)
    return f"**Error:** {msg}"


def _md(title: str, data: dict[str, Any]) -> str:
    lines = [f"**{title}**\n"]
    for k, v in data.items():
        if k == "results" and isinstance(v, list):
            lines.append(f"\n**Results** ({len(v)}):\n```json\n{json.dumps(v, indent=2, default=str)}\n```")
        elif isinstance(v, (dict, list)):
            lines.append(f"**{k}:** {json.dumps(v, default=str)}")
        else:
            lines.append(f"**{k}:** {v}")
    return "\n".join(lines)
