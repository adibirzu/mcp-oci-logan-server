#!/usr/bin/env python3
"""
FastMCP Server for OCI Logging Analytics

A comprehensive MCP server using Python FastMCP with support for:
- All 3 transport options: stdio, SSE (legacy), and HTTP (streamable)
- OAuth 2.0 authentication with token introspection or JWT verification
- Full OCI Logging Analytics integration

Best practices:
- Tool names use snake_case
- No stdout logging (only stderr/file) for stdio transport safety
- Inputs validated with Pydantic type hints and bounds
- Blocking OCI calls offloaded to threads for async responsiveness
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Optional

from pydantic import Field

# Configure logging BEFORE any FastMCP imports (stdio-safe)
logging.basicConfig(
    level=getattr(logging, os.getenv("MCP_LOG_LEVEL", "INFO").upper(), logging.INFO),
    stream=sys.stderr,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("oci_logan_fastmcp")

# FastMCP imports
from fastmcp import FastMCP

# Local imports
from logan_client import LoganClient
from query_validator import QueryValidator

# =============================================================================
# OAuth Configuration
# =============================================================================

def get_auth_provider():
    """
    Configure authentication provider based on environment variables.

    Supports:
    - JWT verification with JWKS endpoint (recommended for production)
    - JWT verification with static public key
    - Token introspection (RFC 7662) for opaque tokens
    - Static tokens for development
    - No auth (disabled)

    Environment variables:
    - MCP_OAUTH_ENABLED: Enable OAuth (default: false)
    - MCP_OAUTH_MODE: jwt, introspection, or static (default: introspection)
    - MCP_OAUTH_JWKS_URI: JWKS endpoint URL for JWT verification
    - MCP_OAUTH_ISSUER_URL: Token issuer URL
    - MCP_OAUTH_AUDIENCE: Expected token audience
    - MCP_OAUTH_INTROSPECTION_URL: Token introspection endpoint
    - MCP_OAUTH_CLIENT_ID: Client ID for introspection
    - MCP_OAUTH_CLIENT_SECRET: Client secret for introspection
    - MCP_OAUTH_REQUIRED_SCOPES: Comma-separated required scopes
    - MCP_OAUTH_PUBLIC_KEY: Static public key (PEM format)
    - MCP_OAUTH_STATIC_TOKENS: JSON dict of static tokens for dev
    """
    oauth_enabled = os.getenv("MCP_OAUTH_ENABLED", "false").lower() == "true"

    if not oauth_enabled:
        logger.info("OAuth authentication disabled")
        return None

    oauth_mode = os.getenv("MCP_OAUTH_MODE", "introspection").lower()
    required_scopes = [
        s.strip() for s in os.getenv("MCP_OAUTH_REQUIRED_SCOPES", "mcp:tools").split(",")
        if s.strip()
    ]

    try:
        if oauth_mode == "jwt":
            return _configure_jwt_auth(required_scopes)
        elif oauth_mode == "introspection":
            return _configure_introspection_auth(required_scopes)
        elif oauth_mode == "static":
            return _configure_static_auth(required_scopes)
        else:
            logger.warning(f"Unknown OAuth mode: {oauth_mode}, disabling auth")
            return None
    except ImportError as e:
        logger.warning(f"OAuth dependencies not available: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to configure OAuth: {e}")
        return None


def _configure_jwt_auth(required_scopes: List[str]):
    """Configure JWT-based authentication."""
    from fastmcp.server.auth.providers.jwt import JWTVerifier

    jwks_uri = os.getenv("MCP_OAUTH_JWKS_URI")
    public_key = os.getenv("MCP_OAUTH_PUBLIC_KEY")
    issuer = os.getenv("MCP_OAUTH_ISSUER_URL")
    audience = os.getenv("MCP_OAUTH_AUDIENCE")
    algorithm = os.getenv("MCP_OAUTH_ALGORITHM", "RS256")

    if jwks_uri:
        logger.info(f"Configuring JWT auth with JWKS endpoint: {jwks_uri}")
        return JWTVerifier(
            jwks_uri=jwks_uri,
            issuer=issuer,
            audience=audience,
            required_scopes=required_scopes if required_scopes else None,
        )
    elif public_key:
        logger.info("Configuring JWT auth with static public key")
        return JWTVerifier(
            public_key=public_key,
            issuer=issuer,
            audience=audience,
            algorithm=algorithm,
            required_scopes=required_scopes if required_scopes else None,
        )
    else:
        raise ValueError("JWT auth requires MCP_OAUTH_JWKS_URI or MCP_OAUTH_PUBLIC_KEY")


def _configure_introspection_auth(required_scopes: List[str]):
    """Configure token introspection-based authentication (RFC 7662)."""
    from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier

    introspection_url = os.getenv("MCP_OAUTH_INTROSPECTION_URL")
    client_id = os.getenv("MCP_OAUTH_CLIENT_ID")
    client_secret = os.getenv("MCP_OAUTH_CLIENT_SECRET")

    if not introspection_url:
        raise ValueError("Introspection auth requires MCP_OAUTH_INTROSPECTION_URL")

    logger.info(f"Configuring token introspection auth: {introspection_url}")
    return IntrospectionTokenVerifier(
        introspection_url=introspection_url,
        client_id=client_id,
        client_secret=client_secret,
        required_scopes=required_scopes if required_scopes else None,
    )


def _configure_static_auth(required_scopes: List[str]):
    """Configure static token authentication for development."""
    from fastmcp.server.auth.providers.jwt import StaticTokenVerifier

    static_tokens_json = os.getenv("MCP_OAUTH_STATIC_TOKENS", "{}")
    try:
        static_tokens = json.loads(static_tokens_json)
    except json.JSONDecodeError:
        # Default development tokens
        static_tokens = {
            "dev-token": {
                "client_id": "dev-client",
                "scopes": ["mcp:tools", "logan:read", "logan:write"],
            }
        }

    logger.info(f"Configuring static token auth with {len(static_tokens)} tokens")
    return StaticTokenVerifier(
        tokens=static_tokens,
        required_scopes=required_scopes if required_scopes else None,
    )


# =============================================================================
# FastMCP Server Instance
# =============================================================================

# Get auth provider based on configuration
auth_provider = get_auth_provider()

# Create FastMCP instance with authentication
mcp = FastMCP(
    name="oci_logan_mcp",
    auth=auth_provider,
)

# =============================================================================
# Shared State
# =============================================================================

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


# =============================================================================
# MCP Tools - Query Execution
# =============================================================================

@mcp.tool()
async def execute_logan_query(
    query: Annotated[str, Field(description="OCI Logging Analytics query string using proper Logan syntax (e.g., '* | stats count by \"Log Source\"')")],
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes (default 24h, max 30 days)")] = 1440,
    max_count: Annotated[int, Field(ge=1, le=2000, description="Maximum rows to return")] = 200,
    console_mode: Annotated[bool, Field(description="Use console-compatible execution")] = False,
    bypass_all_processing: Annotated[bool, Field(description="Skip query rewrites except minimal API fixes")] = False,
    compartment_id: Annotated[Optional[str], Field(description="Optional compartment override (OCID)")] = None,
    region: Annotated[Optional[str], Field(description="Optional region override")] = None,
) -> Dict[str, Any]:
    """
    Execute a Logging Analytics query against OCI.

    IMPORTANT: Use proper OCI Logging Analytics syntax, NOT SQL!

    Examples:
    - List log sources: * | stats count as logrecords by 'Log Source' | sort -logrecords
    - Find errors: Severity = 'error'
    - Top errors by message: Severity = 'error' | stats count by Message | top 10 count
    """
    client = await _get_client(compartment_id, region)

    # Normalize queries from LLMs that might generate SQL/natural language
    normalized_query = query
    was_normalized = False

    try:
        validation_result = await asyncio.to_thread(_validator.validate_and_fix_query, query)
        if validation_result.get("success") and validation_result.get("fixed_query"):
            normalized_query = validation_result["fixed_query"]
            was_normalized = validation_result.get("was_normalized", False) or (normalized_query != query)
            if was_normalized:
                logger.info(f"Query normalized: '{query}' -> '{normalized_query}'")
    except Exception as e:
        logger.warning(f"Query normalization failed: {e}")

    try:
        if console_mode:
            result = await asyncio.to_thread(
                client.execute_query_like_console,
                normalized_query,
                time_range_minutes,
                max_count,
                bypass_all_processing,
            )
        else:
            result = await asyncio.to_thread(
                client.execute_query,
                normalized_query,
                time_range_minutes,
                max_count,
            )

        if was_normalized:
            result["_query_normalized"] = True
            result["_original_query"] = query
            result["_normalized_query"] = normalized_query

        return result
    except Exception as e:
        logger.error(f"execute_logan_query failed: {e}")
        return {
            "success": False,
            "message": "Query execution failed",
            "details": str(e),
            "hint": "Check OCI credentials and verify query syntax.",
            "_original_query": query,
            "_normalized_query": normalized_query if was_normalized else None,
        }


@mcp.tool()
async def validate_logan_query(
    query: Annotated[str, Field(description="Query to validate and normalize")],
) -> Dict[str, Any]:
    """Validate and normalize a Logging Analytics query before execution."""
    try:
        return await asyncio.to_thread(_validator.validate_and_fix_query, query)
    except Exception as e:
        logger.error(f"validate_logan_query failed: {e}")
        return {
            "success": False,
            "message": "Validation failed",
            "details": str(e),
        }


# =============================================================================
# MCP Tools - Resource Management
# =============================================================================

@mcp.tool()
async def list_log_sources(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    display_name: Annotated[Optional[str], Field(description="Filter by display name")] = None,
    source_type: Annotated[Optional[str], Field(description="Filter by source type")] = None,
    is_system: Annotated[Optional[bool], Field(description="Filter system/user sources")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List available log sources from the OCI Log Analytics Management API."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(
            client.list_log_analytics_sources,
            compartment_id,
            display_name,
            source_type,
            is_system,
            limit,
        )
    except Exception as e:
        logger.error(f"list_log_sources failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_active_log_sources(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    time_period_minutes: Annotated[int, Field(ge=1, le=43200, description="Time period for log counts")] = 60,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log sources with their actual log counts for a time period."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(
            client.list_active_log_sources,
            compartment_id,
            time_period_minutes,
            limit,
        )
    except Exception as e:
        logger.error(f"list_active_log_sources failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_log_fields(
    field_name: Annotated[Optional[str], Field(description="Filter by field name")] = None,
    is_system: Annotated[Optional[bool], Field(description="Filter system/user fields")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List available log fields from the Management API."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(
            client.list_log_analytics_fields,
            field_name,
            is_system,
            limit,
        )
    except Exception as e:
        logger.error(f"list_log_fields failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_entities(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    entity_type: Annotated[Optional[str], Field(description="Filter by entity type")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log analytics entities."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(
            client.list_log_analytics_entities,
            compartment_id,
            entity_type,
            None,  # cloud_resource_id
            limit,
        )
    except Exception as e:
        logger.error(f"list_entities failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_parsers(
    parser_name: Annotated[Optional[str], Field(description="Filter by parser name")] = None,
    is_system: Annotated[Optional[bool], Field(description="Filter system/user parsers")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List available log parsers."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(
            client.list_log_analytics_parsers,
            parser_name,
            is_system,
            limit,
        )
    except Exception as e:
        logger.error(f"list_parsers failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_labels(
    label_name: Annotated[Optional[str], Field(description="Filter by label name")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List available log labels."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(
            client.list_log_analytics_labels,
            label_name,
            limit,
        )
    except Exception as e:
        logger.error(f"list_labels failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_lookups(
    lookup_type: Annotated[Optional[str], Field(description="Filter by lookup type")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List lookup tables."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.list_lookups, lookup_type, limit)
    except Exception as e:
        logger.error(f"list_lookups failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def get_lookup(
    lookup_name: Annotated[str, Field(description="Lookup table name")],
) -> Dict[str, Any]:
    """Get details of a specific lookup table."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.get_lookup, lookup_name)
    except Exception as e:
        logger.error(f"get_lookup failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_log_groups(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log groups."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(client.list_log_groups, compartment_id, limit)
    except Exception as e:
        logger.error(f"list_log_groups failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_scheduled_tasks(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List scheduled tasks."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(client.list_scheduled_tasks, compartment_id, limit)
    except Exception as e:
        logger.error(f"list_scheduled_tasks failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_uploads(
    compartment_id: Annotated[Optional[str], Field(description="Compartment OCID")] = None,
    limit: Annotated[int, Field(ge=1, le=100, description="Maximum results")] = 50,
) -> Dict[str, Any]:
    """List recent log uploads."""
    client = await _get_client(compartment_id)
    try:
        return await asyncio.to_thread(client.list_uploads, compartment_id, limit)
    except Exception as e:
        logger.error(f"list_uploads failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def list_categories(
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log categories."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.list_categories, limit)
    except Exception as e:
        logger.error(f"list_categories failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def get_namespace_info() -> Dict[str, Any]:
    """Get namespace information and status."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.get_namespace)
    except Exception as e:
        logger.error(f"get_namespace_info failed: {e}")
        return {"success": False, "error": str(e)}


# =============================================================================
# MCP Tools - Query Assistance
# =============================================================================

@mcp.tool()
async def suggest_query(
    query_string: Annotated[str, Field(description="Partial query for suggestions")],
    limit: Annotated[int, Field(ge=1, le=50, description="Maximum suggestions")] = 10,
) -> Dict[str, Any]:
    """Get query auto-complete suggestions."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.suggest, query_string, "LOG", limit)
    except Exception as e:
        logger.error(f"suggest_query failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def parse_query(
    query_string: Annotated[str, Field(description="Query to parse and validate")],
) -> Dict[str, Any]:
    """Parse and validate query structure, returning column information."""
    client = await _get_client()
    try:
        return await asyncio.to_thread(client.parse_query, query_string, "LOG")
    except Exception as e:
        logger.error(f"parse_query failed: {e}")
        return {"success": False, "error": str(e)}


@mcp.tool()
async def get_working_query_examples() -> Dict[str, Any]:
    """Get examples of working queries for different use cases."""
    return {
        "success": True,
        "examples": _validator.get_working_examples(),
        "tips": [
            "Use single quotes for field names with spaces: 'Log Source'",
            "Stats operations: stats count by FieldName",
            "Time filtering: where Time > dateRelative(1h)",
            "Sort descending: sort -fieldname",
            "Limit results: head 10",
        ],
    }


# =============================================================================
# MCP Tools - Health & Status
# =============================================================================

@mcp.tool()
async def health(
    detail: Annotated[bool, Field(description="Return extended detail")] = False,
) -> Dict[str, Any]:
    """Health/status check for the OCI Logan MCP server."""
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    oauth_enabled = os.getenv("MCP_OAUTH_ENABLED", "false").lower() == "true"

    info: Dict[str, Any] = {
        "status": "ok",
        "server": "oci_logan_mcp",
        "version": "4.0.0",
        "transport": transport,
        "oauth_enabled": oauth_enabled,
        "region": os.getenv("LOGAN_REGION") or os.getenv("OCI_REGION") or "unset",
        "compartment": (
            os.getenv("LOGAN_COMPARTMENT_ID")
            or os.getenv("OCI_COMPARTMENT_ID")
            or os.getenv("OCI_TENANCY")
            or "unset"
        )[:30] + "..." if len(os.getenv("LOGAN_COMPARTMENT_ID", "") or os.getenv("OCI_COMPARTMENT_ID", "") or os.getenv("OCI_TENANCY", "")) > 30 else (
            os.getenv("LOGAN_COMPARTMENT_ID")
            or os.getenv("OCI_COMPARTMENT_ID")
            or os.getenv("OCI_TENANCY")
            or "unset"
        ),
    }

    if detail:
        info["timestamp"] = datetime.now(timezone.utc).isoformat()
        info["python_version"] = sys.version
        info["oauth_mode"] = os.getenv("MCP_OAUTH_MODE", "introspection") if oauth_enabled else "disabled"

        # Test OCI connection
        try:
            client = await _get_client()
            test_result = await asyncio.to_thread(client.test_connection)
            info["oci_connection"] = test_result
        except Exception as e:
            info["oci_connection"] = {"success": False, "error": str(e)}

    return info


@mcp.tool()
async def check_connection() -> Dict[str, Any]:
    """Test connection to OCI Logging Analytics."""
    try:
        client = await _get_client()
        return await asyncio.to_thread(client.test_connection)
    except Exception as e:
        logger.error(f"check_connection failed: {e}")
        return {"success": False, "error": str(e)}


# =============================================================================
# Server Entry Point
# =============================================================================

def main() -> None:
    """
    Run the FastMCP server with configurable transport.

    Environment variables:
    - MCP_TRANSPORT: Transport mode - "stdio" (default), "sse" (legacy), "http", or "streamable-http" (recommended for remote)
    - MCP_HOST: Bind host for network transports (default: 0.0.0.0)
    - MCP_PORT: Port for network transports (default: 8001)
    - MCP_HTTP_HOST: Legacy bind host (fallback)
    - MCP_HTTP_PORT: Legacy port (fallback)
    - MCP_HTTP_PATH: HTTP endpoint path (default: /mcp)

    Transport details:
    - stdio: Standard input/output for local development and Claude Desktop
    - sse: Server-Sent Events (legacy, use HTTP instead for new projects)
    - http / streamable-http: Streamable HTTP transport (recommended for production/remote access)
    """
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    http_host = os.getenv("MCP_HOST", os.getenv("MCP_HTTP_HOST", "0.0.0.0"))
    http_port = int(os.getenv("MCP_PORT", os.getenv("MCP_HTTP_PORT", "8001")))
    http_path = os.getenv("MCP_HTTP_PATH", "/mcp")

    logger.info(
        f"Starting OCI Logan FastMCP server v4.0.0 | transport={transport} | "
        f"oauth={'enabled' if os.getenv('MCP_OAUTH_ENABLED', 'false').lower() == 'true' else 'disabled'}"
    )

    if transport in ("http", "streamable-http"):
        # Streamable HTTP transport (recommended for production)
        logger.info(f"HTTP mode: http://{http_host}:{http_port}{http_path}")
        mcp.run(transport="http", host=http_host, port=http_port, path=http_path)

    elif transport == "sse":
        # Legacy SSE transport (still supported for backward compatibility)
        logger.info(f"SSE mode (legacy): http://{http_host}:{http_port}")
        logger.warning("SSE transport is deprecated. Consider using HTTP transport instead.")
        mcp.run(transport="sse", host=http_host, port=http_port)

    else:
        # Default: stdio transport (for Claude Desktop and local development)
        logger.info("stdio mode: reading from stdin, writing to stdout")
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
