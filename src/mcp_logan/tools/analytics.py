"""Advanced analytics tools (5 tools)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from pydantic import Field


def register_analytics_tools(mcp: Any, client: Any, query_engine: Any) -> None:
    """Register advanced analytics tools on the FastMCP app."""

    def _time_filter(time_range: str) -> str:
        now = datetime.now(timezone.utc)
        mins = query_engine.parse_time_range(time_range)
        start = now - timedelta(minutes=mins)
        return f"and Time >= '{start.isoformat()}' and Time <= '{now.isoformat()}'"

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_execute_advanced_analytics(
        analyticsType: Annotated[str, Field(description="Type: cluster, link, nlp, classify, outlier, sequence, geostats, timecluster")],
        query: Annotated[str, Field(description="Base query")] = "*",
        field: Annotated[str, Field(description="Field to analyze")] = "",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Execute advanced analytics: cluster, link, nlp, classify, outlier, sequence, geostats, timecluster."""
        base = query
        if "Time >" not in base and "dateRelative" not in base:
            base = f"{base} {_time_filter(timeRange)}"

        commands = {
            "cluster": f"cluster maxclusters=10 t=0.8 field={field or '*'}",
            "link": f"link {field or 'Host'}",
            "nlp": "nlp",
            "classify": "classify",
            "outlier": "outlier threshold=2",
            "sequence": "sequence default",
            "geostats": "geostats latfield=lat longfield=lon",
            "timecluster": "timecluster span=1h",
        }

        cmd = commands.get(analyticsType, f"stats count by '{field}'")
        full_query = f"{base} | {cmd}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(full_query, time_minutes, 100, bypass_transform=True)

        data = {"analyticsType": analyticsType, "query": full_query[:200], "timeRange": timeRange, "resultsCount": results.get("total_count", 0), "results": results.get("results", [])[:30]}
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Advanced Analytics", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_execute_statistical_analysis(
        operation: Annotated[str, Field(description="Operation: stats, timestats, eventstats, top, bottom, rare, distinct")],
        fields: Annotated[list[str], Field(description="Fields for analysis (1-20)")],
        groupBy: Annotated[list[str], Field(description="Group-by fields")] = [],
        query: Annotated[str, Field(description="Base query")] = "*",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Execute statistical analysis: stats, timestats, top, bottom, rare, distinct."""
        base = query
        if "Time >" not in base and "dateRelative" not in base:
            base = f"{base} {_time_filter(timeRange)}"

        field_list = ", ".join(f"'{f}'" for f in fields)
        group_parts = ", ".join(f"'{g}'" for g in groupBy)
        group_clause = f" by {group_parts}" if groupBy else ""

        ops = {
            "stats": f"stats count, avg({field_list}), sum({field_list}){group_clause}",
            "timestats": f"timestats count{group_clause}",
            "eventstats": f"eventstats count{group_clause}",
            "top": f"top 10 {field_list}",
            "bottom": f"bottom 10 {field_list}",
            "rare": f"rare {field_list}",
            "distinct": f"stats distinct_count({field_list}){group_clause}",
        }

        cmd = ops.get(operation, f"stats count{group_clause}")
        full_query = f"{base} | {cmd}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(full_query, time_minutes, 100, bypass_transform=True)

        data = {"operation": operation, "fields": fields, "groupBy": groupBy, "timeRange": timeRange, "resultsCount": results.get("total_count", 0), "results": results.get("results", [])[:30]}
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Statistical Analysis", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_execute_field_operations(
        operation: Annotated[str, Field(description="Operation: extract, parse, rename, eval, split, concat, replace")],
        sourceField: Annotated[str, Field(description="Source field name")],
        targetField: Annotated[str, Field(description="Target field name")] = "",
        pattern: Annotated[str, Field(description="Regex pattern for extraction")] = "",
        expression: Annotated[str, Field(description="Expression for eval/replace")] = "",
        query: Annotated[str, Field(description="Base query")] = "*",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Execute field operations: extract, parse, eval, split, concat, replace."""
        base = query
        if "Time >" not in base and "dateRelative" not in base:
            base = f"{base} {_time_filter(timeRange)}"

        target = targetField or f"{sourceField}_result"
        eval_expr = expression or f"'{sourceField}'"
        pat_extract = pattern or "(.*)"
        pat_parse = pattern or "*"
        pat_split = pattern or ","
        pat_replace = pattern or ""
        expr_concat = expression or ""
        expr_replace = expression or ""
        ops = {
            "extract": f"extract field='{sourceField}' '{pat_extract}'",
            "parse": f"parse '{sourceField}' '{pat_parse}'",
            "rename": f"rename '{sourceField}' as '{target}'",
            "eval": f"eval '{target}' = {eval_expr}",
            "split": f"split '{sourceField}' by '{pat_split}'",
            "concat": f"eval '{target}' = concat('{sourceField}', '{expr_concat}')",
            "replace": f"eval '{target}' = replace('{sourceField}', '{pat_replace}', '{expr_replace}')",
        }
        cmd = ops.get(operation, f"fields '{sourceField}'")
        full_query = f"{base} | {cmd}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(full_query, time_minutes, 50, bypass_transform=True)

        data = {"operation": operation, "sourceField": sourceField, "targetField": target, "timeRange": timeRange, "results": results.get("results", [])[:20]}
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Field Operations", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_search_log_patterns(
        pattern: Annotated[str, Field(description="Pattern to search for")],
        logSource: Annotated[str, Field(description="Filter by log source")] = "",
        field: Annotated[str, Field(description="Field to search in")] = "",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 20,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Search for patterns in log data."""
        base = f"'Log Source' = '{logSource}'" if logSource else "*"
        tf = _time_filter(timeRange)
        search_field = field or "Message"
        q = f"{base} {tf} and '{search_field}' like '%{pattern}%' | head {limit}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(q, time_minutes, limit, bypass_transform=True)

        data = {"pattern": pattern, "logSource": logSource or "All", "field": search_field, "matchesFound": results.get("total_count", 0), "results": results.get("results", [])[:20]}
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Log Pattern Search", data)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_correlation_analysis(
        correlationType: Annotated[str, Field(description="Type: temporal, entity, transaction, session, custom")],
        primaryField: Annotated[str, Field(description="Primary field for correlation")],
        secondaryFields: Annotated[list[str], Field(description="Secondary fields to correlate (1-10)")],
        timeWindow: Annotated[str, Field(description="Time window for correlation (e.g., 5m, 1h)")] = "5m",
        query: Annotated[str, Field(description="Base query")] = "*",
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Perform correlation analysis across log fields."""
        base = query
        if "Time >" not in base and "dateRelative" not in base:
            base = f"{base} {_time_filter(timeRange)}"

        all_fields = ", ".join(f"'{f}'" for f in [primaryField, *secondaryFields])
        cmds = {
            "temporal": f"link span={timeWindow} {all_fields}",
            "entity": f"stats count by {all_fields}",
            "transaction": f"transaction '{primaryField}' maxpause={timeWindow}",
            "session": f"stats count, first(Time) as start, last(Time) as end by '{primaryField}'",
        }
        cmd = cmds.get(correlationType, f"stats count by {all_fields}")
        full_query = f"{base} | {cmd}"

        time_minutes = query_engine.parse_time_range(timeRange)
        results = client.execute_query(full_query, time_minutes, 100, bypass_transform=True)

        data = {"correlationType": correlationType, "primaryField": primaryField, "secondaryFields": secondaryFields, "correlationsFound": results.get("total_count", 0), "results": results.get("results", [])[:30]}
        return json.dumps(data, indent=2, default=str) if format == "json" else _md("Correlation Analysis", data)


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
