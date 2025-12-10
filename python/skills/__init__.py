"""
OCI Logan Skills Package - Composable AI Agent Skills

This package provides intelligent, composable skills for OCI Logging Analytics,
following the skillz pattern.

Reference: https://github.com/intellectronica/skillz

Available Skills:
- LogAnalysisSkill: Log search, aggregation, and pattern detection
- SecurityAuditSkill: Security event detection and threat analysis
- AlertCorrelationSkill: Alert grouping and root cause correlation

Adapters:
- LoganClient: Wrapper for OCI Log Analytics API
- SecurityAnalyzer: Security-specific analysis functions
"""

from .log_analysis import LogAnalysisSkill, LogSearchResult, LogAggregation
from .security_audit import SecurityAuditSkill, SecurityEvent, ThreatSummary
from .alert_correlation import AlertCorrelationSkill, CorrelatedAlert
from .adapters import LoganClientAdapter, QueryMapperAdapter

__all__ = [
    # Skills
    "LogAnalysisSkill",
    "SecurityAuditSkill",
    "AlertCorrelationSkill",
    
    # Data classes
    "LogSearchResult",
    "LogAggregation",
    "SecurityEvent",
    "ThreatSummary",
    "CorrelatedAlert",
    
    # Adapters
    "LoganClientAdapter",
    "QueryMapperAdapter",
]

__version__ = "1.0.0"
__author__ = "OCI Logan Team"
