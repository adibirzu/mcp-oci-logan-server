#!/usr/bin/env python3
"""
OCI Logan MCP Server - Enhanced FastMCP Server

Comprehensive MCP server for OCI Logging Analytics with:
- Log analysis and search capabilities
- Security audit and threat detection
- Alert correlation and root cause analysis
- Server manifest for capability discovery

Implements a stdio-safe MCP server using the Python SDK's FastMCP helper.
Best-practice highlights:
- Tool names use snake_case without spaces or dots
- No stdout logging (only stderr/file)
- Inputs validated with type hints and bounds
- Blocking OCI calls are offloaded to threads to keep the event loop responsive
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from dataclasses import asdict
from typing import Annotated, Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP
from pydantic import Field

# Stdio-safe logging (never stdout)
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("oci_logan_mcp")

# FastMCP instance
mcp = FastMCP("oci_logan_mcp")

# Lazy-loaded skill instances
_log_analysis_skill = None
_security_audit_skill = None
_alert_correlation_skill = None


def _get_log_analysis_skill():
    """Lazy-load LogAnalysisSkill."""
    global _log_analysis_skill
    if _log_analysis_skill is None:
        from skills.log_analysis import LogAnalysisSkill
        _log_analysis_skill = LogAnalysisSkill()
    return _log_analysis_skill


def _get_security_audit_skill():
    """Lazy-load SecurityAuditSkill."""
    global _security_audit_skill
    if _security_audit_skill is None:
        from skills.security_audit import SecurityAuditSkill
        _security_audit_skill = SecurityAuditSkill()
    return _security_audit_skill


def _get_alert_correlation_skill():
    """Lazy-load AlertCorrelationSkill."""
    global _alert_correlation_skill
    if _alert_correlation_skill is None:
        from skills.alert_correlation import AlertCorrelationSkill
        _alert_correlation_skill = AlertCorrelationSkill()
    return _alert_correlation_skill


# =============================================================================
# Server Manifest Resource
# =============================================================================

@mcp.resource("server://manifest")
async def server_manifest() -> str:
    """
    Server manifest resource for capability discovery.
    
    Returns server metadata, available skills, and tool categorization.
    """
    manifest = {
        "name": "OCI Logan MCP Server",
        "version": "2.0.0",
        "description": "OCI Logging Analytics MCP Server with intelligent log analysis, security audit, and alert correlation",
        "capabilities": {
            "skills": [
                "log-analysis",
                "security-audit",
                "alert-correlation"
            ],
            "tools": {
                "tier1_instant": [
                    "health",
                    "list_log_sources",
                    "get_log_source_summary",
                    "list_security_check_types",
                    "list_correlation_patterns",
                    "get_namespace_info"
                ],
                "tier2_api": [
                    "search_logs",
                    "aggregate_logs",
                    "run_security_check",
                    "get_threat_summary",
                    "correlate_alerts",
                    "analyze_root_cause"
                ]
            }
        },
        "usage_guide": """
Start with Tier 1 tools for instant metadata and discovery:
1. Use health() to verify connection
2. Use list_log_sources() to see available data sources
3. Use get_log_source_summary() for activity overview

Then use Tier 2 tools for queries and analysis:
1. Use search_logs() for log search
2. Use run_security_check() for security analysis
3. Use correlate_alerts() for incident investigation
4. Use analyze_root_cause() for RCA

Skills provide high-level workflows:
- log-analysis: Search, aggregate, pattern detection
- security-audit: Threat detection, compliance
- alert-correlation: Grouping, RCA, timelines
""",
        "environment_variables": [
            "LOGAN_COMPARTMENT_ID",
            "LOGAN_REGION",
            "OCI_CONFIG_FILE"
        ]
    }
    return json.dumps(manifest, indent=2)


# =============================================================================
# Health and Discovery Tools (Tier 1 - Instant)
# =============================================================================

@mcp.tool()
async def health(
    detail: Annotated[bool, Field(description="Return extended detail")] = False,
) -> Dict[str, Any]:
    """Health/status check for the OCI Logan MCP server."""
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    info: Dict[str, Any] = {
        "status": "ok",
        "server": "oci_logan_mcp",
        "version": "2.0.0",
        "transport": transport,
        "region": os.getenv("LOGAN_REGION") or os.getenv("OCI_REGION") or "unset",
        "default_compartment": os.getenv("LOGAN_COMPARTMENT_ID") or os.getenv("OCI_COMPARTMENT_ID") or os.getenv("OCI_TENANCY") or "unset",
    }
    if detail:
        import datetime
        info["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
        info["python_version"] = sys.version
        info["skills"] = ["LogAnalysisSkill", "SecurityAuditSkill", "AlertCorrelationSkill"]
    return info


@mcp.tool()
async def list_log_sources(
    source_type: Annotated[Optional[str], Field(description="Filter by source type")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List available log sources from OCI Log Analytics (Tier 1 - Management API)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    sources = await asyncio.to_thread(skill.list_log_sources, source_type, limit)
    return {
        "success": True,
        "sources": [asdict(s) for s in sources],
        "total": len(sources)
    }


@mcp.tool()
async def get_log_source_summary(
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
) -> Dict[str, Any]:
    """Get a summary of log sources with activity (Tier 1)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    summary = await asyncio.to_thread(skill.get_log_source_summary, time_range_minutes)
    return {
        "success": True,
        "total_sources": summary.total_sources,
        "active_sources": summary.active_sources,
        "total_log_count": summary.total_log_count,
        "by_type": summary.by_type,
        "top_sources": [asdict(s) for s in summary.top_sources]
    }


@mcp.tool()
async def list_entities(
    entity_type: Annotated[Optional[str], Field(description="Filter by entity type")] = None,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log entities (hosts, instances, etc.) (Tier 1)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    entities = await asyncio.to_thread(skill.list_entities, entity_type, limit)
    return {
        "success": True,
        "entities": entities,
        "total": len(entities)
    }


@mcp.tool()
async def list_log_groups(
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum results")] = 100,
) -> Dict[str, Any]:
    """List log groups (Tier 1)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    groups = await asyncio.to_thread(skill.list_log_groups, limit)
    return {
        "success": True,
        "log_groups": groups,
        "total": len(groups)
    }


@mcp.tool()
async def get_namespace_info() -> Dict[str, Any]:
    """Get namespace information (Tier 1)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    info = await asyncio.to_thread(skill.get_namespace_info)
    return {
        "success": True,
        "namespace": info
    }


# =============================================================================
# Log Analysis Tools (Tier 2 - API Calls)
# =============================================================================

@mcp.tool()
async def search_logs(
    query: Annotated[str, Field(description="OCI Logging Analytics query string")],
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes (default 1h, max 30d)")] = 60,
    max_results: Annotated[int, Field(ge=1, le=2000, description="Maximum results to return")] = 200,
    console_mode: Annotated[bool, Field(description="Use console-compatible execution")] = True,
) -> Dict[str, Any]:
    """Execute a log search query (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    result = await asyncio.to_thread(
        skill.search_logs, query, time_range_minutes, max_results, console_mode
    )
    return {
        "success": True,
        "total_count": result.total_count,
        "results": result.results,
        "query_used": result.query_used,
        "execution_time_ms": result.execution_time_ms,
        "time_range_minutes": result.time_range_minutes,
        "are_partial_results": result.are_partial_results
    }


@mcp.tool()
async def aggregate_logs(
    group_by_field: Annotated[str, Field(description="Field to group by (e.g., 'Log Source', 'Severity')")],
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
    limit: Annotated[int, Field(ge=1, le=1000, description="Maximum groups to return")] = 100,
) -> Dict[str, Any]:
    """Aggregate logs by a field (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    result = await asyncio.to_thread(
        skill.aggregate_logs, group_by_field, time_range_minutes, limit
    )
    return {
        "success": True,
        "field": result.field,
        "values": result.values,
        "total_groups": result.total_groups,
        "total_records": result.total_records,
        "time_range_minutes": result.time_range_minutes
    }


@mcp.tool()
async def get_log_trends(
    time_range_minutes: Annotated[int, Field(ge=60, le=43200, description="Total time range in minutes")] = 1440,
    interval_minutes: Annotated[int, Field(ge=1, le=1440, description="Interval for bucketing")] = 60,
) -> Dict[str, Any]:
    """Get log volume trends over time (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    return await asyncio.to_thread(
        skill.get_log_trends, time_range_minutes, interval_minutes
    )


@mcp.tool()
async def get_top_errors(
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
    limit: Annotated[int, Field(ge=1, le=100, description="Number of top errors")] = 10,
) -> Dict[str, Any]:
    """Get top error messages (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    errors = await asyncio.to_thread(skill.get_top_errors, time_range_minutes, limit)
    return {
        "success": True,
        "errors": errors,
        "total": len(errors),
        "time_range_minutes": time_range_minutes
    }


@mcp.tool()
async def validate_query(
    query: Annotated[str, Field(description="Query to validate")],
) -> Dict[str, Any]:
    """Validate a query string before execution."""
    skill = await asyncio.to_thread(_get_log_analysis_skill)
    return await asyncio.to_thread(skill.validate_query, query)


# =============================================================================
# Security Audit Tools (Tier 1 & 2)
# =============================================================================

@mcp.tool()
async def list_security_check_types() -> Dict[str, Any]:
    """List available security check types (Tier 1 - instant)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    types = await asyncio.to_thread(skill.list_security_check_types)
    return {
        "success": True,
        "check_types": types,
        "total": len(types)
    }


@mcp.tool()
async def run_security_check(
    check_type: Annotated[str, Field(description="Type of security check (e.g., failed_logins, privilege_escalation)")],
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
) -> Dict[str, Any]:
    """Run a security check (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    result = await asyncio.to_thread(
        skill.run_security_check, check_type, time_range_minutes
    )
    return {
        "success": True,
        "check_type": result.check_type.value,
        "description": result.description,
        "total_events": result.total_events,
        "events": [asdict(e) for e in result.events[:50]],  # Limit for response size
        "query_used": result.query_used,
        "time_range_minutes": result.time_range_minutes,
        "recommendations": result.recommendations
    }


@mcp.tool()
async def get_threat_summary(
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
) -> Dict[str, Any]:
    """Get a summary of security threats (Tier 2 - multiple API calls)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    summary = await asyncio.to_thread(skill.get_threat_summary, time_range_minutes)
    return {
        "success": True,
        "total_events": summary.total_events,
        "by_severity": summary.by_severity,
        "by_type": summary.by_type,
        "top_sources": summary.top_sources,
        "top_ips": summary.top_ips,
        "time_range_minutes": summary.time_range_minutes,
        "critical_alerts": [asdict(a) for a in summary.critical_alerts[:10]]
    }


@mcp.tool()
async def detect_failed_logins(
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
    threshold: Annotated[int, Field(ge=1, le=1000, description="Minimum failed attempts to flag")] = 5,
) -> Dict[str, Any]:
    """Detect failed login attempts with threshold (Tier 2)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    return await asyncio.to_thread(
        skill.detect_failed_logins, time_range_minutes, threshold
    )


@mcp.tool()
async def detect_privilege_escalation(
    time_range_minutes: Annotated[int, Field(ge=1, le=43200, description="Time range in minutes")] = 60,
) -> Dict[str, Any]:
    """Detect privilege escalation events (Tier 2)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    return await asyncio.to_thread(
        skill.detect_privilege_escalation, time_range_minutes
    )


@mcp.tool()
async def run_compliance_check(
    time_range_minutes: Annotated[int, Field(ge=60, le=43200, description="Time range in minutes")] = 1440,
) -> Dict[str, Any]:
    """Run a compliance check across all security categories (Tier 2)."""
    skill = await asyncio.to_thread(_get_security_audit_skill)
    checks = await asyncio.to_thread(skill.run_compliance_check, time_range_minutes)
    return {
        "success": True,
        "checks": [asdict(c) for c in checks],
        "passed": sum(1 for c in checks if c.status == "passed"),
        "failed": sum(1 for c in checks if c.status == "failed"),
        "warnings": sum(1 for c in checks if c.status == "warning")
    }


# =============================================================================
# Alert Correlation Tools (Tier 1 & 2)
# =============================================================================

@mcp.tool()
async def list_correlation_patterns() -> Dict[str, Any]:
    """List available correlation patterns (Tier 1 - instant)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    patterns = await asyncio.to_thread(skill.list_correlation_patterns)
    return {
        "success": True,
        "patterns": patterns
    }


@mcp.tool()
async def get_priority_definitions() -> Dict[str, Any]:
    """Get alert priority level definitions (Tier 1 - instant)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    definitions = await asyncio.to_thread(skill.get_priority_definitions)
    return {
        "success": True,
        "priorities": definitions
    }


@mcp.tool()
async def correlate_alerts(
    time_range_minutes: Annotated[int, Field(ge=1, le=1440, description="Time range to search")] = 60,
    correlation_window_minutes: Annotated[int, Field(ge=1, le=60, description="Window for temporal correlation")] = 5,
    min_events: Annotated[int, Field(ge=2, le=100, description="Minimum events for correlation group")] = 2,
) -> Dict[str, Any]:
    """Correlate alerts from logs (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    alerts = await asyncio.to_thread(
        skill.correlate_alerts, time_range_minutes, correlation_window_minutes, min_events
    )
    return {
        "success": True,
        "correlated_alerts": [
            {
                "correlation_id": a.correlation_id,
                "priority": a.priority.value,
                "event_count": a.event_count,
                "sources": a.sources,
                "probable_cause": a.probable_cause,
                "first_seen": a.first_seen,
                "last_seen": a.last_seen,
                "correlation_types": [t.value for t in a.correlation_types],
                "recommendations": a.recommendations
            }
            for a in alerts
        ],
        "total_groups": len(alerts),
        "time_range_minutes": time_range_minutes
    }


@mcp.tool()
async def build_incident_timeline(
    search_query: Annotated[str, Field(description="Query to identify incident-related events")],
    time_range_minutes: Annotated[int, Field(ge=1, le=1440, description="Time range to search")] = 60,
) -> Dict[str, Any]:
    """Build an incident timeline from log events (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    timeline = await asyncio.to_thread(
        skill.build_incident_timeline, search_query, time_range_minutes
    )
    return {
        "success": True,
        "incident_id": timeline.incident_id,
        "start_time": timeline.start_time,
        "end_time": timeline.end_time,
        "event_count": len(timeline.events),
        "events": timeline.events[:50],  # Limit for response size
        "affected_sources": timeline.affected_sources,
        "summary": timeline.summary,
        "phase": timeline.phase
    }


@mcp.tool()
async def analyze_root_cause(
    primary_symptom: Annotated[str, Field(description="Primary symptom (error, service name, etc.)")],
    time_range_minutes: Annotated[int, Field(ge=1, le=1440, description="Time range to search")] = 60,
) -> Dict[str, Any]:
    """Perform root cause analysis (Tier 2 - multiple API calls)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    analysis = await asyncio.to_thread(
        skill.analyze_root_cause, primary_symptom, time_range_minutes
    )
    return {
        "success": True,
        "probable_causes": analysis.probable_causes,
        "confidence_score": analysis.confidence_score,
        "supporting_evidence": analysis.supporting_evidence[:10],
        "recommendations": analysis.recommendations,
        "related_events": analysis.related_events[:20]
    }


@mcp.tool()
async def get_alert_statistics(
    time_range_minutes: Annotated[int, Field(ge=60, le=43200, description="Time range for statistics")] = 1440,
) -> Dict[str, Any]:
    """Get alert statistics (Tier 2 - API call)."""
    skill = await asyncio.to_thread(_get_alert_correlation_skill)
    return await asyncio.to_thread(skill.get_alert_statistics, time_range_minutes)


# =============================================================================
# Skill Discovery Tools
# =============================================================================

@mcp.tool()
async def list_available_skills() -> Dict[str, Any]:
    """List all available skills and their capabilities."""
    return {
        "success": True,
        "skills": [
            {
                "name": "LogAnalysisSkill",
                "description": "Log search, aggregation, and pattern detection",
                "tier1_tools": ["list_log_sources", "get_log_source_summary", "list_entities", "get_namespace_info"],
                "tier2_tools": ["search_logs", "aggregate_logs", "get_log_trends", "get_top_errors"]
            },
            {
                "name": "SecurityAuditSkill",
                "description": "Security event detection and threat analysis",
                "tier1_tools": ["list_security_check_types"],
                "tier2_tools": ["run_security_check", "get_threat_summary", "detect_failed_logins", "detect_privilege_escalation", "run_compliance_check"]
            },
            {
                "name": "AlertCorrelationSkill",
                "description": "Alert grouping, root cause correlation, and incident analysis",
                "tier1_tools": ["list_correlation_patterns", "get_priority_definitions"],
                "tier2_tools": ["correlate_alerts", "build_incident_timeline", "analyze_root_cause", "get_alert_statistics"]
            }
        ]
    }


@mcp.tool()
async def get_skill_for_query(
    query: Annotated[str, Field(description="Natural language query about what you want to do")],
) -> Dict[str, Any]:
    """Get recommended skill and tools for a natural language query."""
    query_lower = query.lower()
    
    recommendations = []
    
    # Security-related queries
    if any(term in query_lower for term in ["security", "threat", "attack", "login", "auth", "compliance", "audit"]):
        recommendations.append({
            "skill": "SecurityAuditSkill",
            "confidence": 0.9,
            "suggested_tools": ["run_security_check", "get_threat_summary", "detect_failed_logins"],
            "reason": "Query appears to be security-related"
        })
    
    # Alert/incident-related queries
    if any(term in query_lower for term in ["alert", "incident", "root cause", "correlate", "rca", "timeline"]):
        recommendations.append({
            "skill": "AlertCorrelationSkill",
            "confidence": 0.85,
            "suggested_tools": ["correlate_alerts", "analyze_root_cause", "build_incident_timeline"],
            "reason": "Query appears to be about incident investigation"
        })
    
    # Log search/analysis queries
    if any(term in query_lower for term in ["log", "search", "error", "find", "source", "aggregate"]):
        recommendations.append({
            "skill": "LogAnalysisSkill",
            "confidence": 0.8,
            "suggested_tools": ["search_logs", "aggregate_logs", "get_top_errors"],
            "reason": "Query appears to be about log search/analysis"
        })
    
    if not recommendations:
        recommendations.append({
            "skill": "LogAnalysisSkill",
            "confidence": 0.5,
            "suggested_tools": ["list_log_sources", "search_logs"],
            "reason": "Default recommendation - start with log exploration"
        })
    
    return {
        "success": True,
        "query": query,
        "recommendations": recommendations
    }


# =============================================================================
# Main Entry Point
# =============================================================================

def main() -> None:
    """Run the FastMCP server (stdio default)."""
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    if transport != "stdio":
        logger.warning("Transport %s not supported; falling back to stdio", transport)
        transport = "stdio"
    logger.info("Starting OCI Logan MCP Server v2.0.0 (%s transport)", transport)
    logger.info("Skills: LogAnalysis, SecurityAudit, AlertCorrelation")
    mcp.run(transport=transport)


if __name__ == "__main__":
    main()
