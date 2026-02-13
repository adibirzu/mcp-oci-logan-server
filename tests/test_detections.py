"""Tests for the detection catalog — loading, indexing, search."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from mcp_logan.detections.catalog import DetectionCatalog


@pytest.fixture
def catalog_with_data(tmp_path):
    """Create a temporary detection catalog with sample rules."""
    rules_dir = tmp_path / "rules"
    rules_dir.mkdir()

    # Create a sample rule file
    rule = {
        "title": "Test Cloud Guard Public Bucket",
        "level": "critical",
        "description": "Detects public bucket access",
        "query": "'Log Source' = 'SOC Cloud Guard Logs' | stats count by 'Resource Name'",
        "mitre_attack": {"technique_id": "T1530", "tactic": "collection"},
        "falsepositives": ["Intentional public buckets"],
    }
    (rules_dir / "test_public_bucket.json").write_text(json.dumps(rule))

    rule2 = {
        "title": "Test Linux SSH Brute Force",
        "level": "high",
        "description": "Detects SSH brute force",
        "query": "'Log Source' = 'SOC Linux Syslog Logs' and Status = 'Failure' | stats count as failures by 'Client Host'",
        "mitre_attack": {"technique_id": "T1110", "tactic": "credential-access"},
        "falsepositives": [],
    }
    (rules_dir / "linux_ssh_brute_force.json").write_text(json.dumps(rule2))

    # Create catalog.json
    catalog_data = {
        "version": "1.0.0",
        "total_rules": 2,
        "total_hunting": 1,
        "platforms": {"oci": 1, "linux": 1},
        "severities": {"critical": 1, "high": 1},
        "mitre_techniques": ["T1530", "T1110"],
        "mitre_tactics": ["collection", "credential-access"],
        "stig_controls": [],
        "rules": [
            {
                "file": "test_public_bucket.json",
                "title": "Test Cloud Guard Public Bucket",
                "level": "critical",
                "platform": "oci",
                "mitre_techniques": ["T1530"],
                "mitre_tactics": ["collection"],
            },
            {
                "file": "linux_ssh_brute_force.json",
                "title": "Test Linux SSH Brute Force",
                "level": "high",
                "platform": "linux",
                "mitre_techniques": ["T1110"],
                "mitre_tactics": ["credential-access"],
            },
        ],
    }
    (rules_dir / "catalog.json").write_text(json.dumps(catalog_data))

    # Create a hunting query
    hunting_dir = rules_dir / "hunting"
    hunting_dir.mkdir()
    hunting_q = {
        "title": "Test Hunting Query",
        "level": "medium",
        "hunting_type": "frequency",
        "cookbook_method": "stacking",
        "description": "Test hunting query",
        "query": "* | stats count by 'Log Source'",
        "logsource": {"product": "oci"},
    }
    (hunting_dir / "test_hunt.json").write_text(json.dumps(hunting_q))

    catalog = DetectionCatalog()
    catalog.rules_path = rules_dir
    catalog.initialize()
    return catalog


class TestCatalogLoading:
    """Test catalog initialization and loading."""

    def test_load_success(self, catalog_with_data):
        assert catalog_with_data.is_loaded is True
        assert catalog_with_data.rule_count == 2

    def test_load_missing_path(self, tmp_path):
        catalog = DetectionCatalog()
        catalog.rules_path = tmp_path / "nonexistent"
        catalog.initialize()
        assert catalog.is_loaded is False

    def test_no_double_load(self, catalog_with_data):
        # Calling initialize() again should be a no-op
        catalog_with_data.initialize()
        assert catalog_with_data.rule_count == 2


class TestCatalogLookups:
    """Test rule and hunting query lookups."""

    def test_get_rule(self, catalog_with_data):
        rule = catalog_with_data.get_rule("test_public_bucket")
        assert rule is not None
        assert rule["title"] == "Test Cloud Guard Public Bucket"
        assert "query" in rule

    def test_get_rule_not_found(self, catalog_with_data):
        rule = catalog_with_data.get_rule("nonexistent_rule")
        assert rule is None

    def test_get_hunting_query(self, catalog_with_data):
        hq = catalog_with_data.get_hunting_query("test_hunt")
        assert hq is not None
        assert hq["title"] == "Test Hunting Query"

    def test_get_hunting_not_found(self, catalog_with_data):
        hq = catalog_with_data.get_hunting_query("nonexistent")
        assert hq is None


class TestCatalogSearch:
    """Test search/filter operations."""

    def test_search_by_platform(self, catalog_with_data):
        results = catalog_with_data.search_rules(platform="oci")
        assert len(results) == 1
        assert results[0]["id"] == "test_public_bucket"

    def test_search_by_level(self, catalog_with_data):
        results = catalog_with_data.search_rules(level="critical")
        assert len(results) == 1
        assert results[0]["level"] == "critical"

    def test_search_by_mitre_technique(self, catalog_with_data):
        results = catalog_with_data.search_rules(mitre_technique="T1110")
        assert len(results) == 1
        assert results[0]["id"] == "linux_ssh_brute_force"

    def test_search_by_keyword(self, catalog_with_data):
        results = catalog_with_data.search_rules(keyword="brute")
        assert len(results) == 1

    def test_search_no_match(self, catalog_with_data):
        results = catalog_with_data.search_rules(keyword="zzznomatch")
        assert len(results) == 0

    def test_list_rules_compact(self, catalog_with_data):
        rules = catalog_with_data.list_rules_compact()
        assert len(rules) == 2
        assert all("id" in r and "title" in r and "level" in r for r in rules)

    def test_list_hunting_compact(self, catalog_with_data):
        hunting = catalog_with_data.list_hunting_compact()
        assert len(hunting) == 1


class TestCatalogStats:
    """Test summary and stats methods."""

    def test_get_summary(self, catalog_with_data):
        summary = catalog_with_data.get_summary()
        assert summary["loaded"] is True
        assert summary["totalRules"] == 2
        assert summary["totalHunting"] == 1

    def test_get_stats(self, catalog_with_data):
        stats = catalog_with_data.get_stats()
        assert stats["loaded"] is True
        assert len(stats["mitreTechniques"]) == 2

    def test_get_mitre_coverage(self, catalog_with_data):
        coverage = catalog_with_data.get_mitre_coverage()
        assert coverage["totalTactics"] == 2
        assert "collection" in coverage["coverage"]

    def test_summary_when_empty(self, tmp_path):
        catalog = DetectionCatalog()
        catalog.rules_path = tmp_path / "empty"
        catalog.initialize()
        summary = catalog.get_summary()
        assert summary["loaded"] is False
        assert summary["totalRules"] == 0
