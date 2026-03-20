"""Resource management tools."""

from __future__ import annotations

import json
from typing import Annotated, Any

from pydantic import Field

from mcp_logan.core.observability import get_logger

log = get_logger("tools.management")


def register_management_tools(mcp: Any, client: Any, query_engine: Any) -> None:
    """Register resource management tools on the FastMCP app."""

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_log_sources(
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        displayName: Annotated[str, Field(description="Filter by display name")] = "",
        isSystem: Annotated[str, Field(description="Filter: true/false/all")] = "",
        limit: Annotated[int, Field(ge=1, le=1000, description="Max results")] = 100,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List available log sources in OCI Logging Analytics via Management API."""
        result = client.list_log_analytics_sources(
            compartment_id=compartmentId or None,
            display_name=displayName or None,
            is_system=isSystem if isSystem in ("true", "false") else None,
            limit=limit,
        )
        return _format(result, "Log Sources", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_log_source_details(
        logSourceName: Annotated[str, Field(description="Log source name")],
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get detailed information about a specific log source."""
        query = f"'Log Source' = '{logSourceName}' | stats count, earliest(Time) as firstSeen, latest(Time) as lastSeen, dc('Host Name') as hostCount"
        result = client.execute_query(query, 43200, 10)  # 30 days
        return _format(result, f"Log Source: {logSourceName}", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_active_log_sources(
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 50,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List log sources with recent activity and log counts."""
        time_minutes = query_engine.parse_time_range(timeRange)
        result = client.list_active_log_sources(
            compartment_id=compartmentId or None,
            time_period_minutes=time_minutes,
            limit=limit,
        )
        return _format(result, "Active Log Sources", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_log_groups(
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        limit: Annotated[int, Field(ge=1, le=1000, description="Max results")] = 100,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List available log groups in OCI Logging Analytics."""
        result = client.list_log_groups(
            compartment_id=compartmentId or None,
            limit=limit,
        )
        return _format(result, "Log Groups", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_log_fields(
        logSourceName: Annotated[str, Field(description="Filter by log source")] = "",
        isSystem: Annotated[str, Field(description="Filter: true/false/all")] = "",
        limit: Annotated[int, Field(ge=1, le=1000, description="Max results")] = 100,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List available fields in log data via Management API."""
        result = client.list_log_analytics_fields(
            field_name=logSourceName or None,
            is_system=isSystem if isSystem in ("true", "false") else None,
            limit=limit,
        )
        return _format(result, "Log Fields", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_field_details(
        fieldName: Annotated[str, Field(description="Field name to inspect")],
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get detailed information about a specific field (sample values, types)."""
        query = f"* | stats count, dc('{fieldName}') as distinctValues by '{fieldName}' | head 10"
        result = client.execute_query(query, 1440, 20)  # 24h
        return _format(result, f"Field: {fieldName}", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_namespace_info(
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get OCI Logging Analytics namespace information."""
        result = client.get_namespace()
        return _format(result, "Namespace Information", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_entities(
        entityType: Annotated[str, Field(description="Entity type: HOST, DATABASE, APPLICATION, all")] = "all",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 50,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List entities (hosts, databases, applications) in Logging Analytics."""
        result = client.list_log_analytics_entities(
            compartment_id=compartmentId or None,
            entity_type=entityType if entityType != "all" else None,
            limit=limit,
        )
        return _format(result, "Entities", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_storage_usage(
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get storage usage statistics for Logging Analytics."""
        time_minutes = query_engine.parse_time_range(timeRange)
        query = "* | timestats count as records, sum(Size) as totalBytes by 'Log Source'"
        result = client.execute_query(query, time_minutes, 100)
        return _format(result, "Storage Usage", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_parsers(
        parserType: Annotated[str, Field(description="Parser type: REGEX, XML, JSON, all")] = "all",
        limit: Annotated[int, Field(ge=1, le=1000, description="Max results")] = 100,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List available log parsers via Management API."""
        result = client.list_log_analytics_parsers(
            parser_name=None,
            is_system=None,
            limit=limit,
        )
        return _format(result, "Parsers", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_labels(
        limit: Annotated[int, Field(ge=1, le=1000, description="Max results")] = 100,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List available labels for log categorization via Management API."""
        result = client.list_log_analytics_labels(limit=limit)
        return _format(result, "Labels", format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_query_recent_uploads(
        timeRange: Annotated[str, Field(description="Time range")] = "24h",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 20,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Query recent log uploads and their status."""
        time_minutes = query_engine.parse_time_range(timeRange)
        query = f"* | stats count as records, earliest(Time) as uploadStart, latest(Time) as uploadEnd by 'Upload Name', 'Log Source' | sort -uploadEnd | head {limit}"
        result = client.execute_query(query, time_minutes, limit)
        return _format(result, "Recent Uploads", format)


def _format(result: dict[str, Any], title: str, fmt: str) -> str:
    if fmt == "json":
        return json.dumps(result, indent=2, default=str)
    lines = [f"**{title}**\n"]
    if not result.get("success"):
        lines.append(f"**Error:** {result.get('error', 'Unknown error')}")
        return "\n".join(lines)
    for key, value in result.items():
        if key in ("success", "data_source", "is_mock_data"):
            continue
        if key == "results" and isinstance(value, list):
            lines.append(f"**Total:** {len(value)}\n```json\n{json.dumps(value[:30], indent=2, default=str)}\n```")
        elif isinstance(value, (dict, list)):
            lines.append(f"**{key}:**\n```json\n{json.dumps(value, indent=2, default=str)}\n```")
        else:
            lines.append(f"**{key}:** {value}")
    return "\n".join(lines)
