"""
Security Audit Skill for OCI Logging Analytics

Provides intelligent security event detection, threat analysis, and audit capabilities.
Follows the skillz pattern for composable AI agent skills.

Reference: https://github.com/intellectronica/skillz
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
from datetime import datetime

from .adapters import LoganClientAdapter, QueryMapperAdapter


class ThreatSeverity(str, Enum):
    """Threat severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class SecurityCheckType(str, Enum):
    """Types of security checks available."""
    FAILED_LOGINS = "failed_logins"
    SUCCESSFUL_LOGINS = "successful_logins"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SUSPICIOUS_NETWORK = "suspicious_network"
    PORT_SCANNING = "port_scanning"
    AUDIT_CHANGES = "audit_changes"
    USER_MANAGEMENT = "user_management"
    HIGH_VOLUME_REQUESTS = "high_volume_requests"
    CLOUD_GUARD = "cloud_guard"
    SECURITY_EVENTS = "security_events"


@dataclass
class SecurityEvent:
    """Represents a security event detected in logs."""
    id: str
    timestamp: str
    event_type: str
    severity: ThreatSeverity
    source: str
    source_ip: str
    message: str
    details: Dict[str, Any]
    count: int = 1


@dataclass
class ThreatSummary:
    """Summary of threats detected in the environment."""
    total_events: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    top_sources: List[Dict[str, Any]]
    top_ips: List[Dict[str, Any]]
    time_range_minutes: int
    critical_alerts: List[SecurityEvent]


@dataclass
class SecurityCheckResult:
    """Result of a security check."""
    check_type: SecurityCheckType
    description: str
    events: List[SecurityEvent]
    total_events: int
    query_used: str
    time_range_minutes: int
    recommendations: List[str]


@dataclass
class ComplianceStatus:
    """Compliance status for a check."""
    check_name: str
    status: str  # passed, failed, warning
    details: str
    last_checked: str
    findings_count: int


class SecurityAuditSkill:
    """
    Security Audit Skill - Intelligent security event detection and analysis.
    
    This skill provides capabilities for:
    - Security event detection (failed logins, privilege escalation, etc.)
    - Threat analysis and severity assessment
    - Compliance auditing
    - Security statistics and trends
    
    Tiers:
    - Tier 1 (Instant): List security check types, cached statistics
    - Tier 2 (API): Security queries, event detection
    """
    
    # Severity mappings for different event types
    SEVERITY_MAP = {
        SecurityCheckType.FAILED_LOGINS: ThreatSeverity.HIGH,
        SecurityCheckType.PRIVILEGE_ESCALATION: ThreatSeverity.CRITICAL,
        SecurityCheckType.SUSPICIOUS_NETWORK: ThreatSeverity.HIGH,
        SecurityCheckType.PORT_SCANNING: ThreatSeverity.MEDIUM,
        SecurityCheckType.AUDIT_CHANGES: ThreatSeverity.MEDIUM,
        SecurityCheckType.USER_MANAGEMENT: ThreatSeverity.MEDIUM,
        SecurityCheckType.HIGH_VOLUME_REQUESTS: ThreatSeverity.MEDIUM,
        SecurityCheckType.CLOUD_GUARD: ThreatSeverity.HIGH,
        SecurityCheckType.SECURITY_EVENTS: ThreatSeverity.MEDIUM,
    }
    
    def __init__(
        self,
        compartment_id: Optional[str] = None,
        region: Optional[str] = None
    ):
        """
        Initialize the Security Audit skill.
        
        Args:
            compartment_id: Optional compartment OCID override
            region: Optional region override
        """
        self._client = LoganClientAdapter(compartment_id, region)
        self._query_mapper = QueryMapperAdapter()
    
    # ==================== Tier 1: Instant Operations ====================
    
    def list_security_check_types(self) -> List[Dict[str, Any]]:
        """
        List available security check types (Tier 1 - instant).
        
        Returns:
            List of security check types with descriptions
        """
        query_info = self._query_mapper.get_security_query_info()
        
        return [
            {
                "type": check_type,
                "description": info.get("description", ""),
                "severity": self.SEVERITY_MAP.get(
                    SecurityCheckType(check_type), ThreatSeverity.MEDIUM
                ).value,
                "query_count": info.get("query_count", 0)
            }
            for check_type, info in query_info.items()
        ]
    
    def get_check_description(self, check_type: str) -> Dict[str, Any]:
        """
        Get details about a specific security check (Tier 1 - instant).
        
        Args:
            check_type: Type of security check
            
        Returns:
            Dict with check details
        """
        query_info = self._query_mapper.get_security_query_info()
        
        if check_type not in query_info:
            return {
                "success": False,
                "error": f"Unknown check type: {check_type}",
                "available_types": list(query_info.keys())
            }
        
        info = query_info[check_type]
        return {
            "success": True,
            "check_type": check_type,
            "description": info.get("description", ""),
            "severity": self.SEVERITY_MAP.get(
                SecurityCheckType(check_type), ThreatSeverity.MEDIUM
            ).value,
            "recommendations": self._get_recommendations(check_type)
        }
    
    def _get_recommendations(self, check_type: str) -> List[str]:
        """Get recommendations for a security check type."""
        recommendations = {
            "failed_logins": [
                "Review failed login patterns for brute force attempts",
                "Consider implementing account lockout policies",
                "Enable multi-factor authentication",
                "Review IP addresses for known bad actors"
            ],
            "privilege_escalation": [
                "Audit all privilege escalation events immediately",
                "Review sudo/su usage patterns",
                "Implement least-privilege access policies",
                "Monitor for unauthorized role assumptions"
            ],
            "suspicious_network": [
                "Review blocked connections for patterns",
                "Update firewall rules if necessary",
                "Investigate source IPs of suspicious traffic",
                "Consider network segmentation"
            ],
            "port_scanning": [
                "Block identified scanning IPs",
                "Review exposed ports and services",
                "Implement rate limiting",
                "Enable intrusion detection"
            ],
            "audit_changes": [
                "Review all configuration changes",
                "Verify changes were authorized",
                "Implement change management workflows",
                "Enable detailed audit logging"
            ],
            "user_management": [
                "Verify user creation/deletion was authorized",
                "Review privileged user accounts",
                "Implement user access reviews",
                "Enable MFA for all users"
            ],
            "high_volume_requests": [
                "Investigate high-volume sources for abuse",
                "Implement rate limiting",
                "Consider DDoS protection",
                "Review API usage patterns"
            ],
            "cloud_guard": [
                "Review Cloud Guard findings immediately",
                "Prioritize critical findings",
                "Implement Cloud Guard responders",
                "Follow remediation guidance"
            ],
            "security_events": [
                "Review all security events",
                "Correlate with other event sources",
                "Implement incident response procedures",
                "Document and track findings"
            ]
        }
        return recommendations.get(check_type, [
            "Review the detected events",
            "Investigate root cause",
            "Implement appropriate controls"
        ])
    
    # ==================== Tier 2: Query Operations ====================
    
    def run_security_check(
        self,
        check_type: str,
        time_range_minutes: int = 60
    ) -> SecurityCheckResult:
        """
        Run a security check (Tier 2 - API call).
        
        Args:
            check_type: Type of security check to run
            time_range_minutes: Time range in minutes
            
        Returns:
            SecurityCheckResult with detected events
        """
        # Get query for this check type
        query_result = self._query_mapper.get_security_query(check_type, time_range_minutes)
        
        if not query_result.get("success"):
            return SecurityCheckResult(
                check_type=SecurityCheckType(check_type) if check_type in SecurityCheckType.__members__.values() else SecurityCheckType.SECURITY_EVENTS,
                description=f"Unknown check type: {check_type}",
                events=[],
                total_events=0,
                query_used="",
                time_range_minutes=time_range_minutes,
                recommendations=[]
            )
        
        # Try each query until one succeeds
        events = []
        successful_query = ""
        
        for query in query_result.get("queries", []):
            result = self._client.execute_query(
                query=query,
                time_range_minutes=time_range_minutes,
                max_count=200,
                console_mode=True
            )
            
            if result.get("success"):
                raw_events = result.get("results", [])
                if raw_events:
                    events = self._parse_security_events(raw_events, check_type)
                    successful_query = query
                    break
                elif not successful_query:
                    successful_query = query
        
        check_type_enum = SecurityCheckType(check_type) if check_type in [e.value for e in SecurityCheckType] else SecurityCheckType.SECURITY_EVENTS
        
        return SecurityCheckResult(
            check_type=check_type_enum,
            description=query_result.get("description", ""),
            events=events,
            total_events=len(events),
            query_used=successful_query,
            time_range_minutes=time_range_minutes,
            recommendations=self._get_recommendations(check_type)
        )
    
    def _parse_security_events(
        self,
        raw_events: List[Dict[str, Any]],
        check_type: str
    ) -> List[SecurityEvent]:
        """Parse raw log results into SecurityEvent objects."""
        events = []
        severity = self.SEVERITY_MAP.get(
            SecurityCheckType(check_type) if check_type in [e.value for e in SecurityCheckType] else SecurityCheckType.SECURITY_EVENTS,
            ThreatSeverity.MEDIUM
        )
        
        for i, raw in enumerate(raw_events):
            event = SecurityEvent(
                id=f"{check_type}_{i}",
                timestamp=raw.get("Datetime") or raw.get("Time") or raw.get("timestamp", ""),
                event_type=check_type,
                severity=severity,
                source=raw.get("Log Source", "Unknown"),
                source_ip=raw.get("Source IP") or raw.get("source_ip") or "Unknown",
                message=raw.get("Log Entry") or raw.get("Message") or "Security event detected",
                details=raw,
                count=int(raw.get("logrecords", 1)) if raw.get("logrecords") else 1
            )
            events.append(event)
        
        return events
    
    def get_threat_summary(self, time_range_minutes: int = 60) -> ThreatSummary:
        """
        Get a summary of security threats (Tier 2 - multiple API calls).
        
        Args:
            time_range_minutes: Time range in minutes
            
        Returns:
            ThreatSummary with aggregated threat information
        """
        all_events: List[SecurityEvent] = []
        by_type: Dict[str, int] = {}
        
        # Run all security checks
        for check_type in SecurityCheckType:
            result = self.run_security_check(check_type.value, time_range_minutes)
            all_events.extend(result.events)
            by_type[check_type.value] = result.total_events
        
        # Calculate severity breakdown
        by_severity: Dict[str, int] = {}
        for event in all_events:
            sev = event.severity.value
            by_severity[sev] = by_severity.get(sev, 0) + event.count
        
        # Get top sources
        source_counts: Dict[str, int] = {}
        for event in all_events:
            source_counts[event.source] = source_counts.get(event.source, 0) + event.count
        top_sources = sorted(
            [{"source": k, "count": v} for k, v in source_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        # Get top IPs
        ip_counts: Dict[str, int] = {}
        for event in all_events:
            if event.source_ip != "Unknown":
                ip_counts[event.source_ip] = ip_counts.get(event.source_ip, 0) + event.count
        top_ips = sorted(
            [{"ip": k, "count": v} for k, v in ip_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        # Get critical alerts
        critical_alerts = [
            e for e in all_events
            if e.severity in [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH]
        ][:20]
        
        total_events = sum(e.count for e in all_events)
        
        return ThreatSummary(
            total_events=total_events,
            by_severity=by_severity,
            by_type=by_type,
            top_sources=top_sources,
            top_ips=top_ips,
            time_range_minutes=time_range_minutes,
            critical_alerts=critical_alerts
        )
    
    def search_security_events(
        self,
        search_terms: List[str],
        log_sources: Optional[List[str]] = None,
        severity: Optional[str] = None,
        time_range_minutes: int = 60
    ) -> List[SecurityEvent]:
        """
        Search for security events by custom criteria (Tier 2 - API call).
        
        Args:
            search_terms: Terms to search for
            log_sources: Optional log source filters
            severity: Optional severity filter
            time_range_minutes: Time range in minutes
            
        Returns:
            List of SecurityEvent objects
        """
        query = self._query_mapper.build_custom_query(
            search_terms, log_sources, severity, time_range_minutes
        )
        
        if not query:
            return []
        
        result = self._client.execute_query(
            query=query,
            time_range_minutes=time_range_minutes,
            max_count=200,
            console_mode=True
        )
        
        if not result.get("success"):
            return []
        
        return self._parse_security_events(
            result.get("results", []),
            "custom_search"
        )
    
    def detect_failed_logins(
        self,
        time_range_minutes: int = 60,
        threshold: int = 5
    ) -> Dict[str, Any]:
        """
        Detect failed login attempts with threshold (Tier 2).
        
        Args:
            time_range_minutes: Time range in minutes
            threshold: Minimum failed attempts to flag
            
        Returns:
            Dict with failed login analysis
        """
        result = self.run_security_check("failed_logins", time_range_minutes)
        
        # Group by source IP
        ip_attempts: Dict[str, int] = {}
        for event in result.events:
            ip = event.source_ip
            ip_attempts[ip] = ip_attempts.get(ip, 0) + event.count
        
        # Find IPs exceeding threshold
        flagged_ips = [
            {"ip": ip, "attempts": count}
            for ip, count in ip_attempts.items()
            if count >= threshold
        ]
        flagged_ips.sort(key=lambda x: x["attempts"], reverse=True)
        
        return {
            "total_failed_logins": result.total_events,
            "unique_source_ips": len(ip_attempts),
            "flagged_ips": flagged_ips,
            "threshold": threshold,
            "time_range_minutes": time_range_minutes,
            "severity": "high" if flagged_ips else "low",
            "recommendations": result.recommendations if flagged_ips else []
        }
    
    def detect_privilege_escalation(
        self,
        time_range_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Detect privilege escalation events (Tier 2).
        
        Args:
            time_range_minutes: Time range in minutes
            
        Returns:
            Dict with privilege escalation analysis
        """
        result = self.run_security_check("privilege_escalation", time_range_minutes)
        
        # Categorize by type
        sudo_events = [e for e in result.events if "sudo" in e.message.lower()]
        su_events = [e for e in result.events if "su:" in e.message.lower()]
        role_events = [e for e in result.events if "role" in e.message.lower() or "assume" in e.message.lower()]
        
        return {
            "total_events": result.total_events,
            "sudo_events": len(sudo_events),
            "su_events": len(su_events),
            "role_assumption_events": len(role_events),
            "events": [
                {
                    "timestamp": e.timestamp,
                    "source": e.source,
                    "message": e.message[:200]
                }
                for e in result.events[:20]
            ],
            "time_range_minutes": time_range_minutes,
            "severity": "critical" if result.total_events > 0 else "info",
            "recommendations": result.recommendations
        }
    
    def run_compliance_check(
        self,
        time_range_minutes: int = 1440
    ) -> List[ComplianceStatus]:
        """
        Run a compliance check across all security categories (Tier 2).
        
        Args:
            time_range_minutes: Time range in minutes
            
        Returns:
            List of ComplianceStatus for each check
        """
        checks = []
        now = datetime.utcnow().isoformat() + "Z"
        
        # Failed logins check
        failed_logins = self.detect_failed_logins(time_range_minutes, threshold=10)
        checks.append(ComplianceStatus(
            check_name="Authentication Security",
            status="failed" if failed_logins["flagged_ips"] else "passed",
            details=f"Found {len(failed_logins['flagged_ips'])} IPs with >10 failed attempts",
            last_checked=now,
            findings_count=len(failed_logins["flagged_ips"])
        ))
        
        # Privilege escalation check
        priv_esc = self.detect_privilege_escalation(time_range_minutes)
        checks.append(ComplianceStatus(
            check_name="Privilege Management",
            status="warning" if priv_esc["total_events"] > 0 else "passed",
            details=f"Found {priv_esc['total_events']} privilege escalation events",
            last_checked=now,
            findings_count=priv_esc["total_events"]
        ))
        
        # Network security check
        network_result = self.run_security_check("suspicious_network", time_range_minutes)
        checks.append(ComplianceStatus(
            check_name="Network Security",
            status="warning" if network_result.total_events > 10 else "passed",
            details=f"Found {network_result.total_events} suspicious network events",
            last_checked=now,
            findings_count=network_result.total_events
        ))
        
        # Audit logging check
        audit_result = self.run_security_check("audit_changes", time_range_minutes)
        checks.append(ComplianceStatus(
            check_name="Audit Logging",
            status="passed" if audit_result.total_events > 0 else "warning",
            details=f"Captured {audit_result.total_events} audit events",
            last_checked=now,
            findings_count=audit_result.total_events
        ))
        
        return checks
    
    def get_security_trends(
        self,
        time_range_minutes: int = 1440,
        interval_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Get security event trends over time (Tier 2).
        
        Args:
            time_range_minutes: Total time range in minutes
            interval_minutes: Interval for bucketing
            
        Returns:
            Dict with security trend data
        """
        # Query for security events by time
        query = f"""* | where contains('Event Name', 'Security') or 
                         contains('Log Source', 'Security') or
                         contains('Severity', 'error') or
                         contains('Severity', 'critical')
                   | stats count as event_count by datefloor('Datetime', '{interval_minutes}m')
                   | sort datefloor"""
        
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
