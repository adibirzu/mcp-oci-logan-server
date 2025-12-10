#!/usr/bin/env python3
"""
FastMCP server for OCI Logan

Implements a minimal, stdio-safe MCP server using the Python SDK's FastMCP helper.
Best-practice highlights:
- Tool names use snake_case without spaces or dots
- No stdout logging (only stderr/file)
- Inputs validated with type hints and bounds
- Blocking OCI calls are offloaded to threads to keep the event loop responsive
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from typing import Annotated, Any, Dict, Optional

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from logan_client import LoganClient
from query_validator import QueryValidator

# Stdio-safe logging (never stdout)
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("oci_logan_fastmcp")

# FastMCP instance
mcp = FastMCP("oci_logan_fastmcp")

# Single shared instances; OCI client is relatively heavyweight
_client: Optional[LoganClient] = None
_validator = QueryValidator()


def _build_client(compartment_id: Optional[str] = None, region: Optional[str] = None) -> LoganClient:
    """Create a LoganClient using env overrides when provided."""
    compartment = (
        compartment_id
        or os.getenv("LOGAN_COMPARTMENT_ID")
        or os.getenv("OCI_COMPARTMENT_ID")
        or os.getenv("OCI_TENANCY")
    )
    if region:
        os.environ["LOGAN_REGION"] = region
    return LoganClient(compartment_id=compartment)


async def _get_client(compartment_id: Optional[str] = None, region: Optional[str] = None) -> LoganClient:
    """Lazy-load the LoganClient in a thread to avoid blocking the event loop."""
    global _client
    if _client is None or compartment_id or region:
        _client = await asyncio.to_thread(_build_client, compartment_id, region)
    return _client


@mcp.tool()
async def execute_logan_query(
    query: Annotated[str, Field(description="OCI Logging Analytics query string")],
    time_range_minutes: Annotated[
        int,
        Field(
            ge=1,
            le=43200,
            description="Time range in minutes (default 24h, max 30 days)",
        ),
    ] = 1440,
    max_count: Annotated[
        int, Field(ge=1, le=2000, description="Maximum rows to return")
    ] = 200,
    console_mode: Annotated[
        bool,
        Field(
            description="Use console-compatible execution (bypasses some normalization)"
        ),
    ] = False,
    bypass_all_processing: Annotated[
        bool,
        Field(
            description="When console_mode is true, skip query rewrites except minimal API fixes"
        ),
    ] = False,
    compartment_id: Annotated[
        Optional[str],
        Field(description="Optional compartment override (OCID)")  # type: ignore[arg-type]
    ] = None,
    region: Annotated[
        Optional[str],
        Field(description="Optional region override (e.g., us-ashburn-1)")  # type: ignore[arg-type]
    ] = None,
) -> Dict[str, Any]:
    """
    Execute a Logging Analytics query.

    - console_mode uses the direct HTTP path to mirror the OCI console behavior.
    - Standard mode applies lightweight fixes and uses the SDK client.
    """
    client = await _get_client(compartment_id, region)

    try:
        if console_mode:
            result = await asyncio.to_thread(
                client.execute_query_like_console,
                query,
                time_range_minutes,
                max_count,
                bypass_all_processing,
            )
        else:
            result = await asyncio.to_thread(
                client.execute_query,
                query,
                time_range_minutes,
                max_count,
            )
        return result
    except Exception as exc:  # Best-effort non-fatal errors; avoid noisy stdout
        logger.error("execute_logan_query failed", exc_info=exc)
        return {
            "success": False,
            "message": "Query execution failed",
            "details": str(exc),
            "hint": "Check OCI credentials/region and verify query syntax.",
        }




@mcp.tool()
async def health(
    detail: Annotated[bool, Field(description="Return extended detail", default=False)] = False,
) -> Dict[str, Any]:
    """Health/status check for the OCI Logan FastMCP server."""
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    info: Dict[str, Any] = {
        "status": "ok",
        "server": "oci_logan_fastmcp",
        "transport": transport,
        "region": os.getenv("LOGAN_REGION") or os.getenv("OCI_REGION") or "unset",
        "default_compartment": os.getenv("LOGAN_COMPARTMENT_ID") or os.getenv("OCI_COMPARTMENT_ID") or os.getenv("OCI_TENANCY") or "unset",
    }
    if detail:
        import datetime
        info["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
        info["python_version"] = sys.version
    return {
        "content": [{"type": "text", "text": __import__("json").dumps(info, indent=2)}]
    }

@mcp.tool()
async def validate_logan_query(
    query: Annotated[str, Field(description="Query to validate and normalize")],
) -> Dict[str, Any]:
    """Validate and normalize a query before execution."""
    try:
        return await asyncio.to_thread(_validator.validate_and_fix_query, query)
    except Exception as exc:
        logger.error("validate_logan_query failed", exc_info=exc)
        return {
            "success": False,
            "message": "Validation failed",
            "details": str(exc),
            "hint": "Provide a plain Logging Analytics query string.",
        }


def main() -> None:
    """Run the FastMCP server (stdio default)."""
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    if transport != "stdio":
        logger.warning("Transport %s not supported in FastMCP path; falling back to stdio", transport)
        transport = "stdio"
    logger.info("Starting OCI Logan FastMCP server (%s transport)", transport)
    mcp.run(transport=transport)


if __name__ == "__main__":
    main()

