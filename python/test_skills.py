#!/usr/bin/env python3
"""
Test script for OCI Logan Skills

Tests the skills layer without requiring OCI credentials (mock mode).
Run with real credentials for integration testing.
"""

import sys
import json
from unittest.mock import Mock, patch


def test_skill_imports():
    """Test that all skills can be imported."""
    print("Testing skill imports...")
    
    try:
        from skills import (
            LogAnalysisSkill,
            SecurityAuditSkill,
            AlertCorrelationSkill,
            LogSearchResult,
            LogAggregation,
            SecurityEvent,
            ThreatSummary,
            CorrelatedAlert
        )
        print("  ✓ All skills imported successfully")
        return True
    except ImportError as e:
        print(f"  ✗ Import failed: {e}")
        return False


def test_security_audit_tier1():
    """Test SecurityAuditSkill Tier 1 operations (no OCI required)."""
    print("\nTesting SecurityAuditSkill Tier 1...")
    
    from skills.security_audit import SecurityAuditSkill
    
    # Create skill with mock adapter
    skill = SecurityAuditSkill.__new__(SecurityAuditSkill)
    skill._client = Mock()
    skill._query_mapper = Mock()
    
    # Mock the query mapper response
    skill._query_mapper.get_security_query_info.return_value = {
        "failed_logins": {"description": "Failed login attempts", "query_count": 5},
        "privilege_escalation": {"description": "Privilege escalation", "query_count": 4}
    }
    
    # Test list_security_check_types
    types = skill.list_security_check_types()
    print(f"  ✓ list_security_check_types: {len(types)} types")
    
    # Test get_check_description
    desc = skill.get_check_description("failed_logins")
    print(f"  ✓ get_check_description: {desc.get('description', 'N/A')}")
    
    # Test recommendations
    recs = skill._get_recommendations("failed_logins")
    print(f"  ✓ _get_recommendations: {len(recs)} recommendations")
    
    return True


def test_alert_correlation_tier1():
    """Test AlertCorrelationSkill Tier 1 operations (no OCI required)."""
    print("\nTesting AlertCorrelationSkill Tier 1...")
    
    from skills.alert_correlation import AlertCorrelationSkill
    
    # Create skill with mock adapter
    skill = AlertCorrelationSkill.__new__(AlertCorrelationSkill)
    skill._client = Mock()
    skill._query_mapper = Mock()
    
    # Test list_correlation_patterns
    patterns = skill.list_correlation_patterns()
    print(f"  ✓ list_correlation_patterns: {len(patterns)} categories")
    assert "database" in patterns
    assert "security" in patterns
    
    # Test get_escalation_rules
    rules = skill.get_escalation_rules()
    print(f"  ✓ get_escalation_rules: {len(rules)} rules")
    
    # Test get_priority_definitions
    priorities = skill.get_priority_definitions()
    print(f"  ✓ get_priority_definitions: {len(priorities)} levels")
    assert priorities[0]["priority"] == "P1"
    
    return True


def test_log_analysis_skill_structure():
    """Test LogAnalysisSkill structure (no OCI required)."""
    print("\nTesting LogAnalysisSkill structure...")
    
    from skills.log_analysis import (
        LogAnalysisSkill,
        LogSearchResult,
        LogAggregation,
        LogSourceSummary,
        LogSeverity
    )
    
    # Test data classes
    result = LogSearchResult(
        total_count=10,
        results=[{"message": "test"}],
        query_used="* | head 10",
        execution_time_ms=100,
        time_range_minutes=60
    )
    print(f"  ✓ LogSearchResult: {result.total_count} results")
    
    aggregation = LogAggregation(
        field="Log Source",
        values=[{"Log Source": "Test", "count": 5}],
        total_groups=1,
        total_records=5,
        time_range_minutes=60
    )
    print(f"  ✓ LogAggregation: {aggregation.total_groups} groups")
    
    # Test severity enum
    assert LogSeverity.CRITICAL.value == "critical"
    print("  ✓ LogSeverity enum works")
    
    return True


def test_security_event_dataclass():
    """Test SecurityEvent dataclass."""
    print("\nTesting SecurityEvent dataclass...")
    
    from skills.security_audit import SecurityEvent, ThreatSeverity
    
    event = SecurityEvent(
        id="test_001",
        timestamp="2025-12-10T12:00:00Z",
        event_type="failed_logins",
        severity=ThreatSeverity.HIGH,
        source="Auth Service",
        source_ip="10.0.0.1",
        message="Failed login attempt",
        details={"user": "admin"}
    )
    
    assert event.id == "test_001"
    assert event.severity == ThreatSeverity.HIGH
    assert event.count == 1  # Default
    print(f"  ✓ SecurityEvent created: {event.id}")
    
    return True


def test_correlated_alert_dataclass():
    """Test CorrelatedAlert dataclass."""
    print("\nTesting CorrelatedAlert dataclass...")
    
    from skills.alert_correlation import (
        CorrelatedAlert,
        AlertPriority,
        CorrelationType
    )
    
    alert = CorrelatedAlert(
        correlation_id="CORR-0001",
        primary_alert={"message": "Primary error"},
        related_alerts=[{"message": "Related error"}],
        correlation_types=[CorrelationType.SOURCE, CorrelationType.TEMPORAL],
        priority=AlertPriority.P2_HIGH,
        first_seen="2025-12-10T11:00:00Z",
        last_seen="2025-12-10T12:00:00Z",
        event_count=5,
        sources=["Database"],
        probable_cause="Database connectivity issue",
        recommendations=["Check connection pool"]
    )
    
    assert alert.priority == AlertPriority.P2_HIGH
    assert len(alert.correlation_types) == 2
    print(f"  ✓ CorrelatedAlert created: {alert.correlation_id}")
    
    return True


def test_adapters():
    """Test adapter classes."""
    print("\nTesting adapters...")
    
    from skills.adapters import LogSource, LogEntity, QueryMapperAdapter
    
    # Test LogSource dataclass
    source = LogSource(
        name="test_source",
        display_name="Test Source",
        source_type="LOG",
        is_system=False,
        description="Test description",
        log_count=100,
        has_data=True
    )
    assert source.has_data == True
    print(f"  ✓ LogSource: {source.display_name}")
    
    # Test LogEntity dataclass
    entity = LogEntity(
        id="entity-placeholder",
        name="test-host",
        entity_type="HOST",
        hostname="test-host.local",
        compartment_id="compartment-placeholder",
        lifecycle_state="ACTIVE"
    )
    assert entity.lifecycle_state == "ACTIVE"
    print(f"  ✓ LogEntity: {entity.name}")
    
    # Test QueryMapperAdapter (partial - without OCI)
    adapter = QueryMapperAdapter()
    types = adapter.list_security_query_types()
    print(f"  ✓ QueryMapperAdapter: {len(types)} security query types")
    
    return True


def test_main_server_tools():
    """Test that main.py tool functions exist."""
    print("\nTesting main.py tool functions...")
    
    # Import the main module
    import main
    
    # Check key functions exist
    assert hasattr(main, 'health')
    assert hasattr(main, 'list_log_sources')
    assert hasattr(main, 'search_logs')
    assert hasattr(main, 'run_security_check')
    assert hasattr(main, 'correlate_alerts')
    assert hasattr(main, 'analyze_root_cause')
    assert hasattr(main, 'server_manifest')
    
    print("  ✓ All key tool functions exist")
    
    return True


def run_all_tests():
    """Run all tests."""
    print("=" * 60)
    print("OCI Logan Skills Test Suite")
    print("=" * 60)
    
    tests = [
        test_skill_imports,
        test_log_analysis_skill_structure,
        test_security_event_dataclass,
        test_correlated_alert_dataclass,
        test_security_audit_tier1,
        test_alert_correlation_tier1,
        test_adapters,
        test_main_server_tools,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"\n  ✗ {test.__name__} failed with exception: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
