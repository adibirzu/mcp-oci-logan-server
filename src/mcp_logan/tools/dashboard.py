"""Dashboard management tools (9 tools)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import Field

from mcp_logan.core.observability import get_logger

log = get_logger("tools.dashboard")


def register_dashboard_tools(mcp: Any, client: Any, query_engine: Any) -> None:
    """Register dashboard management tools on the FastMCP app."""

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_dashboards(
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        displayName: Annotated[str, Field(description="Filter by display name")] = "",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 20,
        offset: Annotated[int, Field(ge=0, description="Pagination offset")] = 0,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List dashboards in OCI Logging Analytics."""
        result = client.list_dashboards(
            compartment_id=compartmentId or None,
            limit=limit + offset,
        )
        if not result.get("success"):
            return _error(result.get("error", "Failed to list dashboards"), format)

        items = result.get("results", [])[offset : offset + limit]
        total = len(result.get("results", []))
        return _paginated("OCI Dashboards", items, total, offset, limit, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_dashboard(
        dashboardId: Annotated[str, Field(description="Dashboard OCID")],
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get detailed information about a specific dashboard."""
        result = client.get_dashboard(dashboard_id=dashboardId)
        if not result.get("success"):
            return _error(f"Dashboard not found: {dashboardId}", format)

        data = result.get("data", {})
        info = {
            "id": dashboardId,
            "displayName": data.get("display_name", ""),
            "description": data.get("description", "No description"),
            "lifecycleState": data.get("lifecycle_state", ""),
            "created": data.get("time_created", ""),
            "updated": data.get("time_updated", ""),
            "widgetCount": len(data.get("widgets", [])),
        }
        return _fmt("Dashboard Details", info, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_get_dashboard_tiles(
        dashboardId: Annotated[str, Field(description="Dashboard OCID")],
        tileType: Annotated[str, Field(description="Filter: all, SEARCH, CHART, TABLE")] = "all",
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """Get tiles/widgets from a specific dashboard."""
        result = client.get_dashboard(dashboard_id=dashboardId)
        if not result.get("success"):
            return _error(f"Dashboard not found: {dashboardId}", format)

        data = result.get("data", {})
        tiles = data.get("widgets", [])

        if tileType != "all":
            tiles = [
                t for t in tiles
                if (t.get("type", "") or t.get("widget_type", "")).lower() == tileType.lower()
            ]

        compact_tiles = [
            {
                "id": t.get("id", ""),
                "displayName": t.get("display_name", t.get("title", "")),
                "type": t.get("type", t.get("widget_type", "")),
                "query": t.get("query", t.get("saved_search_id", "")),
            }
            for t in tiles
        ]

        info = {
            "dashboard": data.get("display_name", ""),
            "totalTiles": len(compact_tiles),
            "filterType": tileType,
            "tiles": compact_tiles,
        }
        return _fmt("Dashboard Tiles", info, format)

    @mcp.tool()
    async def oci_logan_create_dashboard(
        displayName: Annotated[str, Field(description="Dashboard display name")],
        description: Annotated[str, Field(description="Dashboard description")] = "",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        dashboardConfig: Annotated[str, Field(description="Dashboard config as JSON string")] = "{}",
    ) -> str:
        """Create a new dashboard in OCI Logging Analytics."""
        config = json.loads(dashboardConfig) if isinstance(dashboardConfig, str) else dashboardConfig
        result = client.create_dashboard(
            display_name=displayName,
            description=description,
            compartment_id=compartmentId or None,
            config=config,
        )
        if not result.get("success"):
            return _error(result.get("error", "Failed to create dashboard"), "markdown")

        data = result.get("data", {})
        info = {
            "id": data.get("id", ""),
            "displayName": displayName,
            "description": description or "No description",
            "status": data.get("lifecycle_state", "ACTIVE"),
        }
        return _fmt("Dashboard Created", info, "markdown")

    @mcp.tool()
    async def oci_logan_update_dashboard(
        dashboardId: Annotated[str, Field(description="Dashboard OCID")],
        displayName: Annotated[str, Field(description="New display name")] = "",
        description: Annotated[str, Field(description="New description")] = "",
        addWidgets: Annotated[str, Field(description="Widgets to add as JSON")] = "[]",
        removeWidgetIds: Annotated[str, Field(description="Widget IDs to remove as JSON list")] = "[]",
    ) -> str:
        """Update an existing dashboard."""
        widgets_add = json.loads(addWidgets) if isinstance(addWidgets, str) else addWidgets
        widgets_remove = json.loads(removeWidgetIds) if isinstance(removeWidgetIds, str) else removeWidgetIds

        result = client.update_dashboard(
            dashboard_id=dashboardId,
            display_name=displayName or None,
            description=description if description else None,
            add_widgets=widgets_add if widgets_add else None,
            remove_widget_ids=widgets_remove if widgets_remove else None,
        )
        if not result.get("success"):
            return _error(result.get("error", "Failed to update dashboard"), "markdown")

        info = {
            "id": dashboardId,
            "updatedFields": {
                "displayName": "Updated" if displayName else "Unchanged",
                "description": "Updated" if description else "Unchanged",
                "widgetsAdded": len(widgets_add),
                "widgetsRemoved": len(widgets_remove),
            },
            "status": result.get("data", {}).get("lifecycle_state", "ACTIVE"),
        }
        return _fmt("Dashboard Updated", info, "markdown")

    @mcp.tool()
    async def oci_logan_create_saved_search(
        displayName: Annotated[str, Field(description="Saved search display name")],
        query: Annotated[str, Field(description="OCL query string")],
        description: Annotated[str, Field(description="Description")] = "",
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        widgetType: Annotated[str, Field(description="Widget type: SEARCH, CHART, TABLE")] = "SEARCH",
    ) -> str:
        """Create a saved search in OCI Logging Analytics."""
        result = client.create_saved_search(
            display_name=displayName,
            query=query,
            description=description,
            compartment_id=compartmentId or None,
            widget_type=widgetType,
        )
        if not result.get("success"):
            return _error(result.get("error", "Failed to create saved search"), "markdown")

        data = result.get("data", {})
        query_preview = query[:100] + ("..." if len(query) > 100 else "")
        info = {
            "id": data.get("id", ""),
            "displayName": displayName,
            "query": query_preview,
            "widgetType": widgetType,
        }
        return _fmt("Saved Search Created", info, "markdown")

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_list_saved_searches(
        compartmentId: Annotated[str, Field(description="OCI compartment OCID")] = "",
        displayName: Annotated[str, Field(description="Filter by display name")] = "",
        limit: Annotated[int, Field(ge=1, le=100, description="Max results")] = 20,
        offset: Annotated[int, Field(ge=0, description="Pagination offset")] = 0,
        format: Annotated[str, Field(description="Output format")] = "markdown",
    ) -> str:
        """List saved searches in OCI Logging Analytics."""
        result = client.list_saved_searches(
            compartment_id=compartmentId or None,
            limit=limit + offset,
        )
        if not result.get("success"):
            return _error(result.get("error", "Failed to list saved searches"), format)

        items = result.get("results", [])[offset : offset + limit]
        total = len(result.get("results", []))
        return _paginated("Saved Searches", items, total, offset, limit, format)

    @mcp.tool(annotations={"readOnlyHint": True})
    async def oci_logan_export_dashboard(
        dashboardId: Annotated[str, Field(description="Dashboard OCID to export")],
        includeQueries: Annotated[bool, Field(description="Include saved search queries")] = True,
    ) -> str:
        """Export a dashboard as a portable JSON document."""
        result = client.get_dashboard(dashboard_id=dashboardId)
        if not result.get("success"):
            return _error(f"Dashboard not found: {dashboardId}", "markdown")

        data = result.get("data", {})
        export_data = {
            "version": "1.0",
            "exportDate": datetime.now(timezone.utc).isoformat(),
            "dashboard": {
                "displayName": data.get("display_name", ""),
                "description": data.get("description", ""),
                "type": data.get("type", ""),
                "widgets": data.get("widgets", []),
                "config": data.get("config", {}),
            },
        }

        info = {
            "dashboard": data.get("display_name", ""),
            "version": "1.0",
            "includeQueries": includeQueries,
            "widgetCount": len(export_data["dashboard"]["widgets"]),
            "exportData": export_data,
        }
        return _fmt("Dashboard Export", info, "markdown")

    @mcp.tool()
    async def oci_logan_import_dashboard(
        dashboardJson: Annotated[str, Field(description="Exported dashboard JSON string")],
        compartmentId: Annotated[str, Field(description="Target compartment OCID")] = "",
        newDisplayName: Annotated[str, Field(description="Override display name")] = "",
    ) -> str:
        """Import a dashboard from an exported JSON document."""
        import_data = json.loads(dashboardJson)
        if "dashboard" not in import_data:
            return _error("Invalid format: missing dashboard property", "markdown")

        dash = import_data["dashboard"]
        result = client.create_dashboard(
            display_name=newDisplayName or dash.get("displayName", "Imported Dashboard"),
            description=dash.get("description", ""),
            compartment_id=compartmentId or None,
            config={
                "widgets": dash.get("widgets", []),
                "config": dash.get("config", {}),
            },
        )

        if not result.get("success"):
            return _error(result.get("error", "Failed to import dashboard"), "markdown")

        data = result.get("data", {})
        info = {
            "id": data.get("id", ""),
            "displayName": newDisplayName or dash.get("displayName", ""),
            "widgetsImported": len(dash.get("widgets", [])),
            "status": data.get("lifecycle_state", "ACTIVE"),
        }
        return _fmt("Dashboard Imported", info, "markdown")


# ------------------------------------------------------------------
# Formatting helpers
# ------------------------------------------------------------------

def _error(msg: str, fmt: str) -> str:
    if fmt == "json":
        return json.dumps({"error": msg, "success": False}, indent=2)
    return f"**Error:** {msg}"


def _fmt(title: str, data: dict[str, Any], fmt: str) -> str:
    if fmt == "json":
        return json.dumps(data, indent=2, default=str)
    lines = [f"**{title}**\n"]
    for k, v in data.items():
        if isinstance(v, (dict, list)):
            lines.append(f"**{k}:**\n```json\n{json.dumps(v, indent=2, default=str)}\n```")
        else:
            lines.append(f"**{k}:** {v}")
    return "\n".join(lines)


def _paginated(title: str, items: list, total: int, offset: int, limit: int, fmt: str) -> str:
    has_more = offset + len(items) < total
    data = {
        "total": total,
        "count": len(items),
        "offset": offset,
        "hasMore": has_more,
        "items": items,
    }
    if has_more:
        data["nextOffset"] = offset + len(items)
    if fmt == "json":
        return json.dumps(data, indent=2, default=str)
    lines = [
        f"**{title}**\n",
        f"**Total:** {total}",
        f"**Showing:** {len(items)} (offset: {offset})",
        f"**Has More:** {has_more}",
    ]
    if has_more:
        lines.append(f"**Next Offset:** {offset + len(items)}")
    lines.append(f"\n**Items:**\n```json\n{json.dumps(items[:30], indent=2, default=str)}\n```")
    return "\n".join(lines)
