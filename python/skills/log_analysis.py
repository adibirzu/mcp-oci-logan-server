"""
Log Analysis Skill for OCI Logging Analytics

Provides intelligent log search, aggregation, and pattern detection capabilities.
Follows the skillz pattern for composable AI agent skills.

Reference: https://github.com/intellectronica/skillz
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum

from .adapters import LoganClientAdapter, LogSource, QueryMapperAdapter


class LogSeverity(str, Enum):
    """Log severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"
    DEBUG = "debug"


@dataclass
class LogSearchResult:
    """Represents a log search result."""
    total_count: int
    results: List[Dict[str, Any]]
    query_used: str
    execution_time_ms: int
    time_range_minutes: int
    are_partial_results: bool = False


@dataclass
class LogAggregation:
    """Represents an aggregation of logs."""
    field: str
    values: List[Dict[str, Any]]
    total_groups: int
    total_records: int
    time_range_minutes: int


@dataclass
class LogSourceSummary:
    """Summary of log sources in the environment."""
    total_sources: int
    active_sources: int
    total_log_count: int
    by_type: Dict[str, int]
    top_sources: List[LogSource]


@dataclass
class LogPattern:
    """A detected log pattern."""
    pattern: str
    count: int
    percentage: float
    severity: LogSeverity
    example: str


class LogAnalysisSkill:
    """
    Log Analysis Skill - Intelligent log search and analysis.
    
    This skill provides capabilities for:
    - Fast log search with natural language to LOGAN query translation
    - Log source discovery and management
    - Log aggregation and statistics
    - Pattern detection in log streams
    
    Tiers:
    - Tier 1 (Instant): List sources, namespaces, cached metadata
    - Tier 2 (API): Query execution, aggregations
    """
    
    def __init__(
        self,
        compartment_id: Optional[str] = None,
        region: Optional[str] = None
    ):
        """
        Initialize the Log Analysis skill.
        
        Args:
            compartment_id: Optional compartment OCID override
            region: Optional region override
        """
        self._client = LoganClientAdapter(compartment_id, region)
        self._query_mapper = QueryMapperAdapter()
    
    # ==================== Tier 1: Instant Operations ====================
    
    def list_log_sources(
        self,
        source_type: Optional[str] = None,
        limit: int = 100
    ) -> List[LogSource]:
        """
        List available log sources (Tier 1 - uses Management API).
        
        Args:
            source_type: Optional filter by source type
            limit: Maximum results to return
            
        Returns:
            List of LogSource objects
        """
        return self._client.list_log_sources(
            source_type=source_type,
            limit=limit
        )
    
    def get_log_source_summary(self, time_range_minutes: int = 60) -> LogSourceSummary:
        """
        Get a summary of log sources with activity (Tier 1).
        
        Args:
            time_range_minutes: Time range for log counts
            
        Returns:
            LogSourceSummary with statistics
        """
        sources = self._client.list_active_log_sources(
            time_period_minutes=time_range_minutes,
            limit=1000
        )
        
        # Calculate statistics
        by_type: Dict[str, int] = {}
        total_logs = 0
        active_count = 0
        
        for source in sources:
            # Count by type
            by_type[source.source_type] = by_type.get(source.source_type, 0) + 1
            total_logs += source.log_count
            if source.has_data:
                active_count += 1
        
        # Top sources by log count
        top_sources = sorted(sources, key=lambda s: s.log_count, reverse=True)[:10]
        
        return LogSourceSummary(
            total_sources=len(sources),
            active_sources=active_count,
            total_log_count=total_logs,
            by_type=by_type,
            top_sources=top_sources
        )
    
    def list_entities(
        self,
        entity_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List log entities (hosts, instances, etc.) (Tier 1).
        
        Args:
            entity_type: Optional filter by entity type
            limit: Maximum results
            
        Returns:
            List of entity dictionaries
        """
        entities = self._client.list_entities(entity_type=entity_type, limit=limit)
        return [
            {
                "id": e.id,
                "name": e.name,
                "entity_type": e.entity_type,
                "hostname": e.hostname,
                "compartment_id": e.compartment_id,
                "lifecycle_state": e.lifecycle_state
            }
            for e in entities
        ]
    
    def list_log_groups(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List log groups (Tier 1)."""
        return self._client.list_log_groups(limit=limit)
    
    def list_fields(self, is_system: Optional[bool] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List available log fields (Tier 1)."""
        return self._client.list_fields(is_system=is_system, limit=limit)
    
    def list_parsers(self, is_system: Optional[bool] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List log parsers (Tier 1)."""
        return self._client.list_parsers(is_system=is_system, limit=limit)
    
    def get_namespace_info(self) -> Dict[str, Any]:
        """Get namespace information (Tier 1)."""
        return self._client.get_namespace_info()
    
    # ==================== Tier 2: Query Operations ====================
    
    def search_logs(
        self,
        query: str,
        time_range_minutes: int = 60,
        max_results: int = 200,
        console_mode: bool = True
    ) -> LogSearchResult:
        """
        Execute a log search query (Tier 2 - API call).
        
        Args:
            query: LOGAN query string or natural language search
            time_range_minutes: Time range in minutes
            max_results: Maximum results to return
            console_mode: Use console-compatible execution
            
        Returns:
            LogSearchResult with results and metadata
        """
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=max_results,
            console_mode=console_mode
        )
        
        return LogSearchResult(
            total_count=result.get("total_count", 0),
            results=result.get("results", []),
            query_used=result.get("query_used", query),
            execution_time_ms=result.get("execution_time", 0),
            time_range_minutes=time_range_minutes,
            are_partial_results=result.get("are_partial_results", False)
        )
    
    def aggregate_logs(
        self,
        group_by_field: str,
        time_range_minutes: int = 60,
        limit: int = 100
    ) -> LogAggregation:
        """
        Aggregate logs by a field (Tier 2 - API call).
        
        Args:
            group_by_field: Field to group by (e.g., 'Log Source', 'Severity')
            time_range_minutes: Time range in minutes
            limit: Maximum groups to return
            
        Returns:
            LogAggregation with grouped results
        """
        query = f"* | stats count as log_count by '{group_by_field}' | sort -log_count | head {limit}"
        
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=limit,
            console_mode=True
        )
        
        values = result.get("results", [])
        total_records = sum(
            int(v.get("log_count", 0)) if isinstance(v.get("log_count"), (int, str)) else 0
            for v in values
        )
        
        return LogAggregation(
            field=group_by_field,
            values=values,
            total_groups=len(values),
            total_records=total_records,
            time_range_minutes=time_range_minutes
        )
    
    def get_log_trends(
        self,
        time_range_minutes: int = 1440,
        interval_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Get log volume trends over time (Tier 2 - API call).
        
        Args:
            time_range_minutes: Total time range in minutes
            interval_minutes: Interval for bucketing (e.g., 60 for hourly)
            
        Returns:
            Dict with time-series log counts
        """
        # Convert interval to OCI timespan format
        if interval_minutes < 60:
            interval = f"{interval_minutes}m"
        elif interval_minutes < 1440:
            interval = f"{interval_minutes // 60}h"
        else:
            interval = f"{interval_minutes // 1440}d"
        
        query = f"* | stats count as log_count by datefloor('Datetime', '{interval}') | sort datefloor"
        
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=1000,
            console_mode=True
        )
        
        return {
            "success": result.get("success", False),
            "trend_data": result.get("results", []),
            "time_range_minutes": time_range_minutes,
            "interval_minutes": interval_minutes,
            "data_points": len(result.get("results", []))
        }
    
    def search_by_pattern(
        self,
        pattern: str,
        field: str = "Log Entry",
        time_range_minutes: int = 60,
        max_results: int = 200
    ) -> LogSearchResult:
        """
        Search logs by a text pattern (Tier 2 - API call).
        
        Args:
            pattern: Text pattern to search for
            field: Field to search in (default: Log Entry)
            time_range_minutes: Time range in minutes
            max_results: Maximum results
            
        Returns:
            LogSearchResult with matching logs
        """
        query = f"* | where contains('{field}', '{pattern}')"
        return self.search_logs(query, time_range_minutes, max_results)
    
    def get_top_errors(
        self,
        time_range_minutes: int = 60,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top error messages (Tier 2 - API call).
        
        Args:
            time_range_minutes: Time range in minutes
            limit: Number of top errors to return
            
        Returns:
            List of error messages with counts
        """
        query = f"""* | where contains('Severity', 'error') or contains('Severity', 'critical')
                   | stats count as error_count by 'Message'
                   | sort -error_count
                   | head {limit}"""
        
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=limit,
            console_mode=True
        )
        
        return result.get("results", [])
    
    def get_source_activity(
        self,
        source_name: str,
        time_range_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Get activity details for a specific log source (Tier 2).
        
        Args:
            source_name: Name of the log source
            time_range_minutes: Time range in minutes
            
        Returns:
            Dict with source activity details
        """
        # Get log count
        count_query = f"'Log Source' = '{source_name}' | stats count as log_count"
        count_result = self._client.execute_query(
            count_query, time_range_minutes, 1, console_mode=True
        )
        
        # Get recent logs
        recent_query = f"'Log Source' = '{source_name}' | sort -Datetime | head 10"
        recent_result = self._client.execute_query(
            recent_query, time_range_minutes, 10, console_mode=True
        )
        
        log_count = 0
        if count_result.get("success") and count_result.get("results"):
            log_count = int(count_result["results"][0].get("log_count", 0))
        
        return {
            "source_name": source_name,
            "log_count": log_count,
            "time_range_minutes": time_range_minutes,
            "recent_logs": recent_result.get("results", []),
            "has_activity": log_count > 0
        }
    
    # ==================== Helper Methods ====================
    
    def suggest_query(self, partial_query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get query auto-complete suggestions.
        
        Args:
            partial_query: Partial query string
            limit: Maximum suggestions
            
        Returns:
            List of suggestion dictionaries
        """
        return self._client.suggest_query(partial_query, limit)
    
    def validate_query(self, query: str) -> Dict[str, Any]:
        """
        Validate a query string.
        
        Args:
            query: Query string to validate
            
        Returns:
            Validation result with is_valid and any errors
        """
        return self._client.validate_query(query)
    
    def get_dashboard_queries(self, time_range_minutes: int = 1440) -> Dict[str, str]:
        """
        Get predefined dashboard queries.
        
        Args:
            time_range_minutes: Time range for queries
            
        Returns:
            Dict of query name to query string
        """
        return self._query_mapper.get_dashboard_queries(time_range_minutes)
