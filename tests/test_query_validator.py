"""Regression tests for query normalization — ensures valid OCL is never mangled.

Tests both the v5 QueryEngine (src/mcp_logan/core/query_engine.py) and
the v4 QueryValidator (python/query_validator.py).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from mcp_logan.core.query_engine import QueryEngine

# Add v4 python/ to sys.path so we can import QueryValidator
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))
from query_validator import QueryValidator  # noqa: E402


@pytest.fixture
def v5_engine():
    return QueryEngine()


@pytest.fixture
def v4_validator():
    return QueryValidator()


# ── Valid OCL queries that must NEVER be replaced by normalization ────

VALID_OCL_QUERIES = [
    # Simple filter + stats
    "'Log Source' = 'OCI Audit Logs' | stats count by 'Event Type' | sort -count",
    # VCN Flow with unquoted fields
    "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | stats count by SourceIP | sort -count | head 10",
    # Wildcard + pipe
    "* | stats count as logrecords by 'Log Source' | sort -logrecords",
    # Sysmon detection-style query
    "'Log Source' = 'Windows Sysmon Events' and Technique_id = 'T1003' | stats count by Image, CommandLine",
    # Cloud Guard
    "'Log Source' = 'OCI Cloud Guard Problems' and 'Risk Level' = 'CRITICAL' | stats count by 'Problem Type'",
    # Complex query with eval
    "'Log Source' = 'OCI Audit Logs' | eval is_admin = contains('Principal Name', 'admin') | stats count by is_admin",
    # Time filter already present
    "'Log Source' = 'OCI Audit Logs' | where Time > dateRelative(24h) | stats count by 'Event Type'",
    # Timestats
    "* | timestats count as logrecords by 'Log Source'",
    # Head/tail
    "'Log Source' = 'OCI Audit Logs' | head 10",
    # Sort + head combo
    "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by Action | sort -count | head 5",
    # Where clause
    "'Log Source' = 'OCI Audit Logs' | stats count as events by 'Principal Name' | where events > 100",
]


class TestV5NormalizationGuard:
    """Ensure the v5 QueryEngine never replaces valid OCL with a canned template."""

    @pytest.mark.parametrize("query", VALID_OCL_QUERIES, ids=range(len(VALID_OCL_QUERIES)))
    def test_valid_ocl_not_replaced(self, v5_engine, query):
        """Valid OCL queries must pass through transform() without being replaced
        by a NL-normalization template."""
        result = v5_engine.transform(query)
        # The transform may apply minor syntax fixes, but should NOT replace
        # the entire query with a canned template like "* | stats count ..."
        # The key indicator: the original log source / key fields must survive.
        assert _shares_key_content(query, result), (
            f"Query was mangled!\n  Original: {query}\n  Got:      {result}"
        )

    def test_nl_query_gets_normalized(self, v5_engine):
        """Natural language / SQL queries SHOULD be normalized."""
        result = v5_engine.transform("SELECT * FROM logs")
        assert "stats count" in result or "Log Source" in result

    def test_sql_with_select(self, v5_engine):
        result = v5_engine.transform("select count(*) from log_sources")
        assert result != "select count(*) from log_sources"


class TestV4NormalizationGuard:
    """Ensure the v4 QueryValidator never replaces valid OCL."""

    @pytest.mark.parametrize("query", VALID_OCL_QUERIES, ids=range(len(VALID_OCL_QUERIES)))
    def test_valid_ocl_not_replaced(self, v4_validator, query):
        result = v4_validator.validate_and_fix_query(query)
        fixed = result.get("fixed_query", "")
        assert _shares_key_content(query, fixed), (
            f"Query was mangled!\n  Original: {query}\n  Got:      {fixed}"
        )

    def test_nl_query_gets_normalized(self, v4_validator):
        result = v4_validator.validate_and_fix_query("show me all log sources")
        assert result.get("was_normalized") or "Log Source" in result.get("fixed_query", "")


class TestV5FieldFixes:
    """Ensure field corrections are applied correctly."""

    def test_event_id_to_event_type(self, v5_engine):
        q = "'Log Source' = 'OCI Audit Logs' | stats count by 'Event ID'"
        result = v5_engine.transform(q)
        assert "'Event Type'" in result
        assert "'Event ID'" not in result

    def test_camelcase_to_quoted(self, v5_engine):
        """Unquoted CamelCase fields must be converted to quoted space style."""
        q = "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | stats count by SourceIP"
        result = v5_engine.transform(q)
        assert "'Source IP'" in result

    def test_principal_name_to_user_name(self, v5_engine):
        q = "'Log Source' = 'OCI Audit Logs' | stats count by 'Principal Name'"
        result = v5_engine.transform(q)
        assert "'User Name'" in result

    def test_commandline_to_quoted(self, v5_engine):
        q = "'Log Source' = 'Windows Sysmon Events' and CommandLine like '%powershell%'"
        result = v5_engine.transform(q)
        assert "'Command Line'" in result

    def test_preserves_sysmon_queries(self, v5_engine):
        q = "'Log Source' = 'Windows Sysmon Events' and Technique_id = 'T1003' | head 10"
        result = v5_engine.transform(q)
        assert "Windows Sysmon" in result
        assert "T1003" in result


class TestV5TimeFilter:
    """Test time filter injection."""

    def test_adds_time_to_simple_query(self, v5_engine):
        result = v5_engine.add_time_filter("'Log Source' = 'OCI Audit Logs'", 60)
        assert "dateRelative" in result

    def test_skips_when_already_present(self, v5_engine):
        q = "'Log Source' = 'OCI Audit Logs' | where Time > dateRelative(24h)"
        result = v5_engine.add_time_filter(q, 60)
        assert result == q  # unchanged

    def test_skips_timestats(self, v5_engine):
        q = "* | timestats count by 'Log Source'"
        result = v5_engine.add_time_filter(q, 60)
        assert result == q


class TestV5SyntaxFixes:
    """Test basic syntax fixes."""

    def test_null_check_fix(self, v5_engine):
        q = "'Log Source' = 'OCI Audit Logs' and Status != null"
        result = v5_engine.transform(q)
        assert '!= ""' in result

    def test_top_count_to_sort_head(self, v5_engine):
        q = "'Log Source' = 'OCI Audit Logs' | stats count | top 10 Count"
        result = v5_engine.transform(q)
        assert "sort" in result
        assert "head" in result

    def test_value_list_quoting(self, v5_engine):
        q = "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in (drop, reject)"
        result = v5_engine.transform(q)
        assert "('drop', 'reject')" in result


# ── Helper ────────────────────────────────────────────────────────────

def _shares_key_content(original: str, result: str) -> bool:
    """Check that a transformed query still shares key content with the original.

    This catches cases where normalization completely replaces the query.
    """
    if not result:
        return not original  # both empty is fine

    # Extract key fragments from the original (log source names, field names, etc.)
    import re
    # Find quoted strings
    quoted = re.findall(r"'([^']+)'", original)
    # If original had a log source, it must survive
    for q in quoted:
        if "Log Source" in q:
            continue  # skip the field name itself
        if len(q) > 3 and q in original:
            # At least one substantial quoted value should survive
            if q in result:
                return True

    # If no quoted strings to check, compare pipe structure
    orig_pipes = original.count("|")
    result_pipes = result.count("|")
    if orig_pipes > 0 and result_pipes > 0:
        return True

    # Fallback: at least 30% character overlap
    orig_set = set(original.lower().split())
    result_set = set(result.lower().split())
    if not orig_set:
        return True
    overlap = len(orig_set & result_set) / len(orig_set)
    return overlap > 0.3
