"""
Alert Correlation Skill for OCI Logging Analytics

Provides intelligent alert grouping, root cause correlation, and incident analysis.
Follows the skillz pattern for composable AI agent skills.

Reference: https://github.com/intellectronica/skillz
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set
from enum import Enum
from datetime import datetime, timedelta
from collections import defaultdict

from .adapters import LoganClientAdapter, QueryMapperAdapter


class AlertPriority(str, Enum):
    """Alert priority levels."""
    P1_CRITICAL = "P1"
    P2_HIGH = "P2"
    P3_MEDIUM = "P3"
    P4_LOW = "P4"
    P5_INFO = "P5"


class CorrelationType(str, Enum):
    """Types of correlation between alerts."""
    TEMPORAL = "temporal"        # Events close in time
    SOURCE = "source"            # Same source/entity
    PATTERN = "pattern"          # Similar message patterns
    CAUSAL = "causal"            # Cause-effect relationship
    INFRASTRUCTURE = "infrastructure"  # Same infrastructure component


@dataclass
class CorrelatedAlert:
    """Represents a correlated group of alerts."""
    correlation_id: str
    primary_alert: Dict[str, Any]
    related_alerts: List[Dict[str, Any]]
    correlation_types: List[CorrelationType]
    priority: AlertPriority
    first_seen: str
    last_seen: str
    event_count: int
    sources: List[str]
    probable_cause: str
    recommendations: List[str]


@dataclass
class IncidentTimeline:
    """Timeline of events for an incident."""
    incident_id: str
    start_time: str
    end_time: str
    events: List[Dict[str, Any]]
    affected_sources: List[str]
    summary: str
    phase: str  # emerging, active, resolved


@dataclass
class RootCauseAnalysis:
    """Root cause analysis result."""
    probable_causes: List[Dict[str, Any]]
    supporting_evidence: List[Dict[str, Any]]
    confidence_score: float
    recommendations: List[str]
    related_events: List[Dict[str, Any]]


class AlertCorrelationSkill:
    """
    Alert Correlation Skill - Intelligent alert grouping and root cause analysis.
    
    This skill provides capabilities for:
    - Alert grouping and deduplication
    - Temporal correlation of events
    - Root cause identification
    - Incident timeline construction
    - Impact analysis
    
    Tiers:
    - Tier 1 (Instant): Get correlation rules, alert categories
    - Tier 2 (API): Correlate alerts, build timelines, RCA
    """
    
    # Common patterns that indicate related events
    CORRELATION_PATTERNS = {
        "database": ["ORA-", "database", "SQL", "connection", "timeout"],
        "network": ["connection", "timeout", "refused", "unreachable", "DNS"],
        "authentication": ["login", "auth", "password", "credential", "denied"],
        "storage": ["disk", "storage", "space", "I/O", "volume"],
        "application": ["error", "exception", "crash", "restart", "OOM"],
        "security": ["attack", "blocked", "firewall", "malicious", "threat"]
    }
    
    # Priority escalation rules
    ESCALATION_RULES = {
        "failed_logins": {"count_threshold": 10, "time_window_minutes": 5, "escalate_to": AlertPriority.P1_CRITICAL},
        "database_errors": {"count_threshold": 5, "time_window_minutes": 10, "escalate_to": AlertPriority.P2_HIGH},
        "network_errors": {"count_threshold": 20, "time_window_minutes": 5, "escalate_to": AlertPriority.P2_HIGH},
        "security_events": {"count_threshold": 3, "time_window_minutes": 15, "escalate_to": AlertPriority.P1_CRITICAL},
    }
    
    def __init__(
        self,
        compartment_id: Optional[str] = None,
        region: Optional[str] = None
    ):
        """
        Initialize the Alert Correlation skill.
        
        Args:
            compartment_id: Optional compartment OCID override
            region: Optional region override
        """
        self._client = LoganClientAdapter(compartment_id, region)
        self._query_mapper = QueryMapperAdapter()
    
    # ==================== Tier 1: Instant Operations ====================
    
    def list_correlation_patterns(self) -> Dict[str, List[str]]:
        """
        List available correlation patterns (Tier 1 - instant).
        
        Returns:
            Dict of category to pattern keywords
        """
        return self.CORRELATION_PATTERNS.copy()
    
    def get_escalation_rules(self) -> Dict[str, Dict[str, Any]]:
        """
        Get alert escalation rules (Tier 1 - instant).
        
        Returns:
            Dict of rule name to escalation parameters
        """
        return self.ESCALATION_RULES.copy()
    
    def get_priority_definitions(self) -> List[Dict[str, Any]]:
        """
        Get priority level definitions (Tier 1 - instant).
        
        Returns:
            List of priority definitions
        """
        return [
            {
                "priority": AlertPriority.P1_CRITICAL.value,
                "name": "Critical",
                "description": "Immediate action required - major service impact",
                "response_time": "15 minutes",
                "examples": ["Complete service outage", "Data breach", "Critical security incident"]
            },
            {
                "priority": AlertPriority.P2_HIGH.value,
                "name": "High",
                "description": "Urgent attention needed - significant impact",
                "response_time": "1 hour",
                "examples": ["Partial service degradation", "Performance critical", "Security warning"]
            },
            {
                "priority": AlertPriority.P3_MEDIUM.value,
                "name": "Medium",
                "description": "Attention needed - moderate impact",
                "response_time": "4 hours",
                "examples": ["Non-critical errors", "Performance degradation", "Configuration issues"]
            },
            {
                "priority": AlertPriority.P4_LOW.value,
                "name": "Low",
                "description": "Monitor - minimal impact",
                "response_time": "24 hours",
                "examples": ["Warning conditions", "Capacity alerts", "Minor issues"]
            },
            {
                "priority": AlertPriority.P5_INFO.value,
                "name": "Informational",
                "description": "For awareness only",
                "response_time": "As needed",
                "examples": ["Status updates", "Audit logs", "Notifications"]
            }
        ]
    
    # ==================== Tier 2: Query Operations ====================
    
    def correlate_alerts(
        self,
        time_range_minutes: int = 60,
        correlation_window_minutes: int = 5,
        min_events: int = 2
    ) -> List[CorrelatedAlert]:
        """
        Correlate alerts from logs (Tier 2 - API call).
        
        Args:
            time_range_minutes: Time range to search
            correlation_window_minutes: Time window for temporal correlation
            min_events: Minimum events to form a correlation group
            
        Returns:
            List of CorrelatedAlert groups
        """
        # Query for error/warning events
        query = """* | where contains('Severity', 'error') or 
                        contains('Severity', 'critical') or 
                        contains('Severity', 'warning')
                   | sort -Datetime"""
        
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=500,
            console_mode=True
        )
        
        if not result.get("success"):
            return []
        
        events = result.get("results", [])
        return self._group_correlated_events(events, correlation_window_minutes, min_events)
    
    def _group_correlated_events(
        self,
        events: List[Dict[str, Any]],
        window_minutes: int,
        min_events: int
    ) -> List[CorrelatedAlert]:
        """Group events into correlated alert clusters."""
        if not events:
            return []
        
        # Group by source first
        source_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for event in events:
            source = event.get("Log Source", "Unknown")
            source_groups[source].append(event)
        
        correlated_alerts = []
        correlation_id = 0
        
        for source, source_events in source_groups.items():
            if len(source_events) < min_events:
                continue
            
            # Detect pattern matches
            patterns_found: Set[str] = set()
            for event in source_events:
                message = str(event.get("Log Entry", "") or event.get("Message", "")).lower()
                for category, keywords in self.CORRELATION_PATTERNS.items():
                    if any(kw.lower() in message for kw in keywords):
                        patterns_found.add(category)
            
            # Determine correlation types
            correlation_types = [CorrelationType.SOURCE]
            if len(source_events) >= 3:
                correlation_types.append(CorrelationType.TEMPORAL)
            if patterns_found:
                correlation_types.append(CorrelationType.PATTERN)
            
            # Determine priority
            priority = self._calculate_priority(source_events, patterns_found)
            
            # Get timestamps
            timestamps = [
                e.get("Datetime") or e.get("Time") or ""
                for e in source_events
            ]
            timestamps = [t for t in timestamps if t]
            
            # Create correlated alert
            correlation_id += 1
            alert = CorrelatedAlert(
                correlation_id=f"CORR-{correlation_id:04d}",
                primary_alert=source_events[0],
                related_alerts=source_events[1:] if len(source_events) > 1 else [],
                correlation_types=correlation_types,
                priority=priority,
                first_seen=min(timestamps) if timestamps else "",
                last_seen=max(timestamps) if timestamps else "",
                event_count=len(source_events),
                sources=[source],
                probable_cause=self._identify_probable_cause(source_events, patterns_found),
                recommendations=self._get_correlation_recommendations(patterns_found)
            )
            correlated_alerts.append(alert)
        
        # Sort by priority
        priority_order = {
            AlertPriority.P1_CRITICAL: 1,
            AlertPriority.P2_HIGH: 2,
            AlertPriority.P3_MEDIUM: 3,
            AlertPriority.P4_LOW: 4,
            AlertPriority.P5_INFO: 5
        }
        correlated_alerts.sort(key=lambda a: priority_order.get(a.priority, 5))
        
        return correlated_alerts
    
    def _calculate_priority(
        self,
        events: List[Dict[str, Any]],
        patterns: Set[str]
    ) -> AlertPriority:
        """Calculate priority based on events and patterns."""
        # Check for critical patterns
        if "security" in patterns:
            return AlertPriority.P1_CRITICAL
        
        # Check event count thresholds
        if len(events) >= 20:
            return AlertPriority.P1_CRITICAL
        elif len(events) >= 10:
            return AlertPriority.P2_HIGH
        elif len(events) >= 5:
            return AlertPriority.P3_MEDIUM
        elif len(events) >= 2:
            return AlertPriority.P4_LOW
        
        return AlertPriority.P5_INFO
    
    def _identify_probable_cause(
        self,
        events: List[Dict[str, Any]],
        patterns: Set[str]
    ) -> str:
        """Identify probable cause from event patterns."""
        if "database" in patterns:
            return "Database connectivity or performance issue"
        elif "network" in patterns:
            return "Network connectivity or latency issue"
        elif "authentication" in patterns:
            return "Authentication failure - possible brute force or credential issue"
        elif "storage" in patterns:
            return "Storage capacity or I/O performance issue"
        elif "security" in patterns:
            return "Security event - potential attack or policy violation"
        elif "application" in patterns:
            return "Application error or crash"
        
        # Analyze first event message
        first_message = str(events[0].get("Log Entry", "") or events[0].get("Message", ""))
        if "error" in first_message.lower():
            return "Application or system error detected"
        elif "timeout" in first_message.lower():
            return "Service or resource timeout"
        elif "failed" in first_message.lower():
            return "Operation failure"
        
        return "Multiple related events detected - requires investigation"
    
    def _get_correlation_recommendations(self, patterns: Set[str]) -> List[str]:
        """Get recommendations based on detected patterns."""
        recommendations = []
        
        if "database" in patterns:
            recommendations.extend([
                "Check database connection pool status",
                "Review database performance metrics",
                "Verify database instance health"
            ])
        if "network" in patterns:
            recommendations.extend([
                "Check network connectivity between services",
                "Review firewall rules and security lists",
                "Verify DNS resolution"
            ])
        if "authentication" in patterns:
            recommendations.extend([
                "Review authentication logs for patterns",
                "Check for compromised credentials",
                "Consider enabling MFA if not already"
            ])
        if "storage" in patterns:
            recommendations.extend([
                "Check storage capacity and utilization",
                "Review I/O metrics and latency",
                "Consider storage scaling or cleanup"
            ])
        if "security" in patterns:
            recommendations.extend([
                "Investigate security events immediately",
                "Check for unauthorized access attempts",
                "Review Cloud Guard findings"
            ])
        if "application" in patterns:
            recommendations.extend([
                "Review application logs for stack traces",
                "Check application resource utilization",
                "Consider application restart if persistent"
            ])
        
        if not recommendations:
            recommendations = [
                "Investigate the correlated events",
                "Check system health metrics",
                "Review recent changes"
            ]
        
        return recommendations
    
    def build_incident_timeline(
        self,
        search_query: str,
        time_range_minutes: int = 60
    ) -> IncidentTimeline:
        """
        Build an incident timeline from log events (Tier 2 - API call).
        
        Args:
            search_query: Query to identify incident-related events
            time_range_minutes: Time range to search
            
        Returns:
            IncidentTimeline with ordered events
        """
        result = self._client.execute_query(
            query=f"{search_query} | sort Datetime",
            time_range_minutes=time_range_minutes,
            max_count=500,
            console_mode=True
        )
        
        events = result.get("results", []) if result.get("success") else []
        
        if not events:
            return IncidentTimeline(
                incident_id=f"INC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                start_time="",
                end_time="",
                events=[],
                affected_sources=[],
                summary="No events found for the query",
                phase="resolved"
            )
        
        # Extract timestamps and sources
        timestamps = []
        sources = set()
        for event in events:
            ts = event.get("Datetime") or event.get("Time") or ""
            if ts:
                timestamps.append(ts)
            source = event.get("Log Source", "")
            if source:
                sources.add(source)
        
        # Determine phase based on recency
        now = datetime.utcnow()
        phase = "resolved"
        if timestamps:
            # Check if last event is within 15 minutes
            # (Simplified - in real implementation would parse timestamp)
            phase = "active" if len(events) > 5 else "emerging"
        
        return IncidentTimeline(
            incident_id=f"INC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            start_time=min(timestamps) if timestamps else "",
            end_time=max(timestamps) if timestamps else "",
            events=events,
            affected_sources=list(sources),
            summary=f"Incident affecting {len(sources)} source(s) with {len(events)} events",
            phase=phase
        )
    
    def analyze_root_cause(
        self,
        primary_symptom: str,
        time_range_minutes: int = 60
    ) -> RootCauseAnalysis:
        """
        Perform root cause analysis (Tier 2 - multiple API calls).
        
        Args:
            primary_symptom: Description of the primary symptom (error, service name, etc.)
            time_range_minutes: Time range to search
            
        Returns:
            RootCauseAnalysis with findings
        """
        probable_causes: List[Dict[str, Any]] = []
        supporting_evidence: List[Dict[str, Any]] = []
        related_events: List[Dict[str, Any]] = []
        
        # Search for events matching the symptom
        symptom_query = f"* | search \"{primary_symptom}\" | sort -Datetime | head 50"
        symptom_result = self._client.execute_query(
            symptom_query, time_range_minutes, 50, console_mode=True
        )
        
        if symptom_result.get("success"):
            related_events.extend(symptom_result.get("results", [])[:20])
        
        # Look for preceding errors
        error_query = """* | where contains('Severity', 'error') or contains('Severity', 'critical')
                        | sort -Datetime | head 50"""
        error_result = self._client.execute_query(
            error_query, time_range_minutes, 50, console_mode=True
        )
        
        if error_result.get("success"):
            errors = error_result.get("results", [])
            
            # Analyze error patterns
            error_sources: Dict[str, int] = defaultdict(int)
            for error in errors:
                source = error.get("Log Source", "Unknown")
                error_sources[source] += 1
            
            # Top error sources are probable causes
            for source, count in sorted(error_sources.items(), key=lambda x: -x[1])[:3]:
                probable_causes.append({
                    "source": source,
                    "error_count": count,
                    "description": f"Errors from {source} may indicate root cause",
                    "confidence": min(0.9, 0.3 + count * 0.1)
                })
            
            supporting_evidence.extend(errors[:10])
        
        # Check for resource-related issues
        resource_query = """* | where contains('Message', 'memory') or 
                                   contains('Message', 'CPU') or
                                   contains('Message', 'disk') or
                                   contains('Message', 'connection')
                          | sort -Datetime | head 20"""
        resource_result = self._client.execute_query(
            resource_query, time_range_minutes, 20, console_mode=True
        )
        
        if resource_result.get("success") and resource_result.get("results"):
            resource_events = resource_result.get("results", [])
            if resource_events:
                probable_causes.append({
                    "source": "Resource Constraint",
                    "error_count": len(resource_events),
                    "description": "Resource-related events detected (memory, CPU, disk, connections)",
                    "confidence": 0.6
                })
                supporting_evidence.extend(resource_events[:5])
        
        # Calculate overall confidence
        confidence = max([c.get("confidence", 0) for c in probable_causes]) if probable_causes else 0.0
        
        # Generate recommendations
        recommendations = self._generate_rca_recommendations(probable_causes)
        
        return RootCauseAnalysis(
            probable_causes=probable_causes,
            supporting_evidence=supporting_evidence,
            confidence_score=confidence,
            recommendations=recommendations,
            related_events=related_events
        )
    
    def _generate_rca_recommendations(
        self,
        probable_causes: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on probable causes."""
        recommendations = []
        
        for cause in probable_causes:
            source = cause.get("source", "").lower()
            description = cause.get("description", "").lower()
            
            if "database" in source or "sql" in description:
                recommendations.append("Review database performance and connection pool settings")
            elif "network" in source or "connection" in description:
                recommendations.append("Check network connectivity and firewall rules")
            elif "resource" in source or "memory" in description or "cpu" in description:
                recommendations.append("Review resource utilization and consider scaling")
            elif "security" in source or "auth" in description:
                recommendations.append("Investigate security events and access patterns")
            else:
                recommendations.append(f"Investigate issues in {cause.get('source', 'the system')}")
        
        # Add general recommendations
        recommendations.extend([
            "Review recent changes and deployments",
            "Check system health dashboards",
            "Correlate with monitoring metrics"
        ])
        
        return list(dict.fromkeys(recommendations))  # Remove duplicates while preserving order
    
    def get_alert_statistics(
        self,
        time_range_minutes: int = 1440
    ) -> Dict[str, Any]:
        """
        Get alert statistics (Tier 2 - API call).
        
        Args:
            time_range_minutes: Time range for statistics
            
        Returns:
            Dict with alert statistics
        """
        # Query for all severity events
        severity_query = """* | stats count as event_count by 'Severity' | sort -event_count"""
        severity_result = self._client.execute_query(
            severity_query, time_range_minutes, 100, console_mode=True
        )
        
        # Query for top sources
        source_query = """* | where contains('Severity', 'error') or contains('Severity', 'warning')
                         | stats count as event_count by 'Log Source' | sort -event_count | head 10"""
        source_result = self._client.execute_query(
            source_query, time_range_minutes, 10, console_mode=True
        )
        
        # Query for hourly trend
        trend_query = """* | where contains('Severity', 'error') or contains('Severity', 'warning')
                        | stats count as event_count by datefloor('Datetime', '1h') | sort datefloor"""
        trend_result = self._client.execute_query(
            trend_query, time_range_minutes, 100, console_mode=True
        )
        
        return {
            "time_range_minutes": time_range_minutes,
            "by_severity": severity_result.get("results", []) if severity_result.get("success") else [],
            "top_sources": source_result.get("results", []) if source_result.get("success") else [],
            "hourly_trend": trend_result.get("results", []) if trend_result.get("success") else [],
            "generated_at": datetime.utcnow().isoformat() + "Z"
        }
    
    def deduplicate_alerts(
        self,
        alerts: List[Dict[str, Any]],
        similarity_threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """
        Deduplicate similar alerts (Tier 1 - local processing).
        
        Args:
            alerts: List of alert dictionaries
            similarity_threshold: Threshold for considering alerts as duplicates
            
        Returns:
            Deduplicated list of alerts with counts
        """
        if not alerts:
            return []
        
        # Group by message similarity (simplified - uses exact match on key fields)
        groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        for alert in alerts:
            # Create a key from source and truncated message
            source = alert.get("Log Source", "")
            message = str(alert.get("Log Entry", "") or alert.get("Message", ""))[:100]
            key = f"{source}|{message}"
            groups[key].append(alert)
        
        # Create deduplicated alerts with counts
        deduped = []
        for key, group in groups.items():
            representative = group[0].copy()
            representative["duplicate_count"] = len(group)
            representative["first_occurrence"] = min(
                a.get("Datetime", "") or a.get("Time", "") for a in group
            )
            representative["last_occurrence"] = max(
                a.get("Datetime", "") or a.get("Time", "") for a in group
            )
            deduped.append(representative)
        
        # Sort by duplicate count
        deduped.sort(key=lambda a: a.get("duplicate_count", 1), reverse=True)
        
        return deduped
