"""
Adapters for OCI Logan Skills

Provides clean interfaces to the underlying OCI Log Analytics services.
These adapters wrap the existing logan_client and query_mapper for use in skills.
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

# Add parent directory to path for importing logan_client and query_mapper
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logan_client import LoganClient
from query_mapper import QueryMapper


@dataclass
class LogSource:
    """Represents a log source in OCI Logging Analytics."""
    name: str
    display_name: str
    source_type: str
    is_system: bool
    description: str
    log_count: int = 0
    has_data: bool = False


@dataclass
class LogEntity:
    """Represents a log entity (host, instance, etc.)."""
    id: str
    name: str
    entity_type: str
    hostname: str
    compartment_id: str
    lifecycle_state: str


class LoganClientAdapter:
    """
    Adapter for OCI Log Analytics client.
    
    Provides a clean interface for skills to interact with OCI Log Analytics.
    Handles client lifecycle and error handling.
    """
    
    def __init__(self, compartment_id: Optional[str] = None, region: Optional[str] = None):
        """
        Initialize the Logan client adapter.
        
        Args:
            compartment_id: Optional compartment OCID override
            region: Optional region override
        """
        self._compartment_id = compartment_id
        self._region = region
        self._client: Optional[LoganClient] = None
    
    def _get_client(self) -> LoganClient:
        """Lazy-load the Logan client."""
        if self._client is None:
            if self._region:
                os.environ['LOGAN_REGION'] = self._region
            self._client = LoganClient(compartment_id=self._compartment_id)
        return self._client
    
    def execute_query(
        self,
        query: str,
        time_range_minutes: int = 1440,
        max_count: int = 200,
        console_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Execute a Logging Analytics query.
        
        Args:
            query: The LOGAN query string
            time_range_minutes: Time range in minutes (default 24h)
            max_count: Maximum rows to return
            console_mode: Use console-compatible execution
            
        Returns:
            Query results dict with success, results, total_count
        """
        client = self._get_client()
        
        try:
            if console_mode:
                return client.execute_query_like_console(
                    query, time_range_minutes, max_count, bypass_all_processing=False
                )
            else:
                return client.execute_query(query, time_range_minutes, max_count)
        except Exception as e:
            return {"success": False, "error": str(e), "results": []}
    
    def list_log_sources(
        self,
        display_name: Optional[str] = None,
        source_type: Optional[str] = None,
        is_system: Optional[bool] = None,
        limit: int = 100
    ) -> List[LogSource]:
        """
        List log sources from OCI Log Analytics.
        
        Args:
            display_name: Filter by display name
            source_type: Filter by source type
            is_system: Filter by system/user source
            limit: Maximum results to return
            
        Returns:
            List of LogSource objects
        """
        client = self._get_client()
        result = client.list_log_analytics_sources(
            display_name=display_name,
            source_type=source_type,
            is_system=is_system,
            limit=limit
        )
        
        if not result.get("success"):
            return []
        
        return [
            LogSource(
                name=s.get("name", ""),
                display_name=s.get("display_name", ""),
                source_type=s.get("source_type", "UNKNOWN"),
                is_system=s.get("is_system", False),
                description=s.get("description", ""),
                log_count=s.get("log_count", 0),
                has_data=s.get("has_data", False)
            )
            for s in result.get("results", [])
        ]
    
    def list_active_log_sources(
        self,
        time_period_minutes: int = 60,
        limit: int = 100
    ) -> List[LogSource]:
        """
        List log sources with their actual log counts.
        
        Args:
            time_period_minutes: Time range for log counts
            limit: Maximum results to return
            
        Returns:
            List of LogSource objects with log counts
        """
        client = self._get_client()
        result = client.list_active_log_sources(
            time_period_minutes=time_period_minutes,
            limit=limit
        )
        
        if not result.get("success"):
            return []
        
        return [
            LogSource(
                name=s.get("name", ""),
                display_name=s.get("display_name", ""),
                source_type=s.get("source_type", "UNKNOWN"),
                is_system=s.get("is_system", False),
                description=s.get("description", ""),
                log_count=s.get("log_count", 0),
                has_data=s.get("has_data", False)
            )
            for s in result.get("results", [])
        ]
    
    def list_entities(
        self,
        entity_type: Optional[str] = None,
        limit: int = 100
    ) -> List[LogEntity]:
        """
        List log analytics entities.
        
        Args:
            entity_type: Filter by entity type
            limit: Maximum results to return
            
        Returns:
            List of LogEntity objects
        """
        client = self._get_client()
        result = client.list_log_analytics_entities(
            entity_type=entity_type,
            limit=limit
        )
        
        if not result.get("success"):
            return []
        
        return [
            LogEntity(
                id=e.get("id", ""),
                name=e.get("name", ""),
                entity_type=e.get("entity_type_name", "UNKNOWN"),
                hostname=e.get("hostname", ""),
                compartment_id=e.get("compartment_id", ""),
                lifecycle_state=e.get("lifecycle_state", "UNKNOWN")
            )
            for e in result.get("results", [])
        ]
    
    def list_log_groups(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List log groups."""
        client = self._get_client()
        result = client.list_log_groups(limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_lookups(self, lookup_type: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List lookup tables."""
        client = self._get_client()
        result = client.list_lookups(lookup_type=lookup_type, limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_scheduled_tasks(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List scheduled tasks."""
        client = self._get_client()
        result = client.list_scheduled_tasks(limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_fields(self, is_system: Optional[bool] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List log fields."""
        client = self._get_client()
        result = client.list_log_analytics_fields(is_system=is_system, limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_parsers(self, is_system: Optional[bool] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List log parsers."""
        client = self._get_client()
        result = client.list_log_analytics_parsers(is_system=is_system, limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_labels(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List log labels."""
        client = self._get_client()
        result = client.list_log_analytics_labels(limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def list_categories(self, limit: int = 100) -> List[Dict[str, Any]]:
        """List log categories."""
        client = self._get_client()
        result = client.list_categories(limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def get_namespace_info(self) -> Dict[str, Any]:
        """Get namespace information."""
        client = self._get_client()
        result = client.get_namespace()
        if result.get("success") and result.get("results"):
            return result["results"][0]
        return {}
    
    def suggest_query(self, partial_query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get query suggestions for auto-complete."""
        client = self._get_client()
        result = client.suggest(partial_query, limit=limit)
        return result.get("results", []) if result.get("success") else []
    
    def validate_query(self, query: str) -> Dict[str, Any]:
        """Validate a query string."""
        client = self._get_client()
        return client.parse_query(query)
    
    def test_connection(self) -> Dict[str, Any]:
        """Test the OCI connection."""
        client = self._get_client()
        return client.test_connection()


class QueryMapperAdapter:
    """
    Adapter for the Query Mapper.
    
    Provides predefined security queries and custom query building.
    """
    
    def __init__(self):
        """Initialize the query mapper adapter."""
        self._mapper = QueryMapper()
    
    def get_security_query(self, check_type: str, time_period_minutes: int = 1440) -> Dict[str, Any]:
        """
        Get predefined security query.
        
        Args:
            check_type: Type of security check (failed_logins, privilege_escalation, etc.)
            time_period_minutes: Time range for the query
            
        Returns:
            Dict with queries and metadata
        """
        return self._mapper.get_security_query(check_type, time_period_minutes)
    
    def list_security_query_types(self) -> List[str]:
        """List available security query types."""
        result = self._mapper.list_available_queries()
        if result.get("success"):
            return list(result.get("security_queries", {}).keys())
        return []
    
    def get_security_query_info(self) -> Dict[str, Dict[str, Any]]:
        """Get info about all security query types."""
        result = self._mapper.list_available_queries()
        return result.get("security_queries", {}) if result.get("success") else {}
    
    def build_custom_query(
        self,
        search_terms: List[str],
        log_sources: Optional[List[str]] = None,
        severity: Optional[str] = None,
        time_period_minutes: int = 1440
    ) -> str:
        """
        Build a custom query from search terms.
        
        Args:
            search_terms: Terms to search for
            log_sources: Optional log source filters
            severity: Optional severity filter
            time_period_minutes: Time range for the query
            
        Returns:
            The built query string
        """
        result = self._mapper.create_custom_query(
            search_terms, log_sources, severity, time_period_minutes
        )
        return result.get("query", "") if result.get("success") else ""
    
    def get_dashboard_queries(self, time_period_minutes: int = 1440) -> Dict[str, str]:
        """
        Get queries for dashboard statistics.
        
        Args:
            time_period_minutes: Time range for queries
            
        Returns:
            Dict of query name to query string
        """
        result = self._mapper.get_dashboard_queries(time_period_minutes)
        return result.get("queries", {}) if result.get("success") else {}
