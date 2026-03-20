"""Integration tests for the CAP tenancy.

These tests require live OCI credentials with the 'cap' profile.
Skipped automatically when credentials are not available.
"""

from __future__ import annotations

import os

import pytest

# Skip entire module if OCI credentials are not available
pytestmark = pytest.mark.skipif(
    not os.path.exists(os.path.expanduser("~/.oci/config")),
    reason="OCI config not found — skipping integration tests",
)


def _get_client():
    """Create a LoganClient configured for CAP profile."""
    # Temporarily set env vars for the test
    os.environ.setdefault("OCI_PROFILE", "cap")
    os.environ.setdefault("OCI_REGION", "eu-frankfurt-1")

    from mcp_logan.core.client import LoganClient

    client = LoganClient()
    try:
        client.initialize()
    except Exception as e:
        pytest.skip(f"Cannot initialize OCI client: {e}")
    return client


def _get_catalog():
    """Create a detection catalog."""
    from mcp_logan.core.detection_catalog import DetectionCatalog

    catalog = DetectionCatalog()
    catalog.initialize()
    return catalog


class TestHealthCheck:
    """Verify connectivity to the CAP tenancy."""

    def test_client_initializes(self):
        client = _get_client()
        assert client._initialized
        assert client._namespace

    def test_namespace_not_empty(self):
        client = _get_client()
        assert len(client._namespace) > 0


class TestQueryExecution:
    """Run basic queries against live data."""

    def test_log_source_stats(self):
        client = _get_client()
        results = client.execute_query(
            "* | stats count as logrecords by 'Log Source' | sort -logrecords",
            time_period_minutes=1440,
            limit=20,
        )
        assert results.get("success"), f"Query failed: {results.get('error')}"
        assert results.get("total_count", 0) > 0

    def test_vcn_flow_query(self):
        client = _get_client()
        results = client.execute_query(
            "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by Action | head 5",
            time_period_minutes=1440,
            limit=10,
        )
        assert results.get("success"), f"Query failed: {results.get('error')}"

    def test_audit_query(self):
        client = _get_client()
        results = client.execute_query(
            "'Log Source' = 'OCI Audit Logs' | stats count by 'Event Type' | sort -count | head 5",
            time_period_minutes=1440,
            limit=10,
        )
        assert results.get("success"), f"Query failed: {results.get('error')}"


class TestDetectionExecution:
    """Run detection rules against live data."""

    def test_catalog_loads(self):
        catalog = _get_catalog()
        stats = catalog.get_stats()
        assert stats.get("total_rules", 0) > 0

    def test_search_detections(self):
        catalog = _get_catalog()
        results = catalog.search_rules(platform="oci", level="high")
        assert len(results) > 0

    def test_run_detection_rule(self):
        """Run a known detection rule and verify it executes without error."""
        client = _get_client()
        catalog = _get_catalog()

        # Find a rule to test
        rules = catalog.search_rules(platform="oci", level="high")
        if not rules:
            pytest.skip("No OCI high-severity rules found")

        rule = catalog.get_rule(rules[0]["id"])
        query = rule.get("query", "")
        if not query:
            pytest.skip("Rule has no query")

        from mcp_logan.core.query_engine import QueryEngine

        engine = QueryEngine()
        time_minutes = engine.parse_time_range("24h")
        results = client.execute_query(query, time_minutes, 10, bypass_transform=True)
        # We just verify execution doesn't error — results may be empty
        assert "error" not in results or results.get("success")


class TestSecurityEvents:
    """Test security event search."""

    def test_search_all(self):
        client = _get_client()
        results = client.execute_query(
            "Message like '%failed%' | stats count as events by 'Log Source', Severity | sort -events | head 10",
            time_period_minutes=1440,
            limit=10,
        )
        assert results.get("success"), f"Query failed: {results.get('error')}"


class TestListSources:
    """Test log source listing."""

    def test_list_active_sources(self):
        client = _get_client()
        results = client.execute_query(
            "* | stats count as logrecords by 'Log Source' | sort -logrecords | head 20",
            time_period_minutes=1440,
            limit=20,
        )
        assert results.get("success"), f"Query failed: {results.get('error')}"
        assert results.get("total_count", 0) > 0
