"""Tests for the query engine — transformations, time parsing, log source aliases."""

from __future__ import annotations

import pytest

from mcp_logan.core.query_engine import QueryEngine


@pytest.fixture
def engine():
    return QueryEngine()


class TestTimeRangeParsing:
    """Test parse_time_range() with various formats."""

    def test_hours(self, engine):
        assert engine.parse_time_range("1h") == 60
        assert engine.parse_time_range("6h") == 360
        assert engine.parse_time_range("24h") == 1440

    def test_days(self, engine):
        assert engine.parse_time_range("1d") == 1440
        assert engine.parse_time_range("7d") == 10080
        assert engine.parse_time_range("30d") == 43200

    def test_weeks_months(self, engine):
        assert engine.parse_time_range("1w") == 10080
        assert engine.parse_time_range("1m") == 43200

    def test_unlisted_falls_to_default(self, engine):
        # Minute-level ranges not in mapping fall to 24h default
        assert engine.parse_time_range("5m") == 1440
        assert engine.parse_time_range("30m") == 1440

    def test_default(self, engine):
        assert engine.parse_time_range("unknown") == 1440  # 24h default


class TestLogSourceAliases:
    """Test log source alias mapping for detection rule retry."""

    def test_cloud_guard_aliases(self, engine):
        aliases = engine.get_log_source_aliases("SOC Cloud Guard Logs")
        assert "SOC Cloud Guard Logs" in aliases
        assert "OCI Cloud Guard Problems" in aliases

    def test_unknown_source_returns_empty(self, engine):
        aliases = engine.get_log_source_aliases("SomeRandomSource")
        assert aliases == []


class TestQueryTransform:
    """Test the query transformation pipeline."""

    def test_passthrough_simple(self, engine):
        q = "* | stats count by 'Log Source'"
        result = engine.transform(q)
        # Should remain valid — the exact output depends on transform logic
        assert "stats count" in result

    def test_preserves_pipe_commands(self, engine):
        q = "'Log Source' = 'OCI Audit Logs' | stats count by 'Principal Name' | sort -count"
        result = engine.transform(q)
        assert "sort" in result

    def test_handles_empty(self, engine):
        result = engine.transform("")
        assert result == "" or result == "*"  # Either is acceptable


class TestReplaceLogSource:
    """Test log source replacement in queries."""

    def test_replace(self, engine):
        q = "'Log Source' = 'SOC Cloud Guard Logs' | stats count"
        result = engine.replace_log_source(q, "SOC Cloud Guard Logs", "OCI Cloud Guard Problems")
        assert "OCI Cloud Guard Problems" in result
        assert "SOC Cloud Guard Logs" not in result
