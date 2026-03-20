"""20 integration questions for the Logan MCP server.

Each question is something an analyst or LLM would ask, paired with the
OCL query that answers it.  Run with: pytest tests/integration_questions.py -v

Requires live OCI credentials (cap profile).  Skipped in CI.
"""

from __future__ import annotations

import json
import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.path.exists(os.path.expanduser("~/.oci/config")),
    reason="OCI config not found — skipping integration tests",
)


# ── The 20 Questions ─────────────────────────────────────────────────

QUESTIONS: list[dict] = [
    # ── Overview & Inventory ──────────────────────────────────────────
    {
        "id": 1,
        "question": "What log sources are active and how much data does each have?",
        "query": "* | stats count as logrecords by 'Log Source' | sort -logrecords",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 2,
        "question": "How many total log records were ingested per day this week?",
        "query": "* | timestats count as logrecords by 'Log Source'",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 3,
        "question": "Which entities (hosts/resources) are generating the most logs?",
        "query": "* | stats count as logrecords by Entity | sort -logrecords | head 15",
        "time_range": "7d",
        "expect_rows": True,
    },

    # ── Network Security (VCN Flow) ──────────────────────────────────
    {
        "id": 4,
        "question": "How many network flows were dropped or rejected in the last 24 hours?",
        "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | stats count as blocked_flows by Action",
        "time_range": "24h",
        "expect_rows": True,
    },
    {
        "id": 5,
        "question": "What are the top 10 source IPs generating blocked traffic?",
        "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | stats count as blocked by 'Source IP' | sort -blocked | head 10",
        "time_range": "24h",
        "expect_rows": True,
    },
    {
        "id": 6,
        "question": "Which destination ports are most targeted by blocked connections?",
        "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action in ('drop', 'reject') | stats count as hits by 'Destination Port' | sort -hits | head 10",
        "time_range": "24h",
        "expect_rows": True,
    },
    {
        "id": 7,
        "question": "What is the hourly trend of accepted vs blocked network flows?",
        "query": "'Log Source' = 'OCI VCN Flow Unified Schema Logs' | timestats span=1h count as flows by Action",
        "time_range": "24h",
        "expect_rows": True,
    },

    # ── OCI Audit & Identity ─────────────────────────────────────────
    {
        "id": 8,
        "question": "What are the most common OCI API operations in the audit log?",
        "query": "'Log Source' = 'OCI Audit Logs' | stats count as events by 'Event Type' | sort -events | head 15",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 9,
        "question": "Which OCI users (principals) are most active?",
        "query": "'Log Source' = 'OCI Audit Logs' | stats count as events by 'User Name' | sort -events | head 10",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 10,
        "question": "Are there any failed OCI console login attempts?",
        "query": "'Log Source' = 'OCI Audit Logs' and 'Event Type' like '%login%' | stats count as attempts by 'User Name', 'Source IP', Status | sort -attempts",
        "time_range": "7d",
        "expect_rows": False,  # may or may not have failures
    },
    {
        "id": 11,
        "question": "What OCI resources were created or deleted recently?",
        "query": "'Log Source' = 'OCI Audit Logs' and ('Event Type' like '%Create%' or 'Event Type' like '%Delete%') | stats count as events by 'Event Type', 'Resource Type' | sort -events | head 15",
        "time_range": "7d",
        "expect_rows": True,
    },

    # ── Endpoint Security (Windows Sysmon) ───────────────────────────
    {
        "id": 12,
        "question": "What MITRE ATT&CK techniques have been observed on endpoints?",
        "query": "'Log Source' = 'Windows Sysmon Events' and Technique_id != '' | stats count as detections by Technique_id | sort -detections | head 15",
        "time_range": "30d",
        "expect_rows": False,  # depends on Sysmon data availability
    },
    {
        "id": 13,
        "question": "Which processes are making the most outbound network connections (Sysmon Event ID 3)?",
        "query": "'Log Source' = 'Windows Sysmon Events' and 'Event ID' = '3' | stats count as connections by 'Process Name' | sort -connections | head 10",
        "time_range": "30d",
        "expect_rows": False,
    },
    {
        "id": 14,
        "question": "Are there any suspicious process creation events with encoded PowerShell commands?",
        "query": "'Log Source' = 'Windows Sysmon Events' and 'Event ID' = '1' and 'Command Line' like '%encoded%' | stats count as events by 'Process Name', 'Command Line' | head 10",
        "time_range": "30d",
        "expect_rows": False,
    },
    {
        "id": 15,
        "question": "What DNS queries have endpoints made (Sysmon Event ID 22)?",
        "query": "'Log Source' = 'Windows Sysmon Events' and 'Event ID' = '22' | stats count as queries by 'Query Name' | sort -queries | head 15",
        "time_range": "30d",
        "expect_rows": False,
    },

    # ── Cross-Source Security Analysis ────────────────────────────────
    {
        "id": 16,
        "question": "What is the overall severity distribution across all log sources?",
        "query": "Severity != '' | stats count as events by Severity, 'Log Source' | sort -events | head 20",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 17,
        "question": "Which source IPs appear across multiple log sources (potential lateral movement)?",
        "query": "'Source IP' != '' | stats distinctcount('Log Source') as source_count, count as events by 'Source IP' | where source_count > 1 | sort -source_count | head 10",
        "time_range": "7d",
        "expect_rows": False,
    },
    {
        "id": 18,
        "question": "What are the error and critical events across all sources in the last 24h?",
        "query": "Severity in ('error', 'critical') | stats count as events by 'Log Source', Severity | sort -events",
        "time_range": "24h",
        "expect_rows": False,
    },

    # ── Operational Intelligence ──────────────────────────────────────
    {
        "id": 19,
        "question": "What is the data ingestion volume trend over the past week?",
        "query": "* | timestats count as logrecords",
        "time_range": "7d",
        "expect_rows": True,
    },
    {
        "id": 20,
        "question": "Which compartments have the most OCI audit activity?",
        "query": "'Log Source' = 'OCI Audit Logs' | stats count as events by 'Compartment Name' | sort -events | head 10",
        "time_range": "7d",
        "expect_rows": True,
    },
]


# ── Test runner ───────────────────────────────────────────────────────

def _get_client():
    os.environ.setdefault("OCI_PROFILE", "cap")
    os.environ.setdefault("OCI_REGION", "eu-frankfurt-1")
    from mcp_logan.core.client import LoganClient
    client = LoganClient()
    try:
        client.initialize()
    except Exception as e:
        pytest.skip(f"Cannot initialize OCI client: {e}")
    return client


@pytest.fixture(scope="module")
def client():
    return _get_client()


@pytest.mark.parametrize(
    "q",
    QUESTIONS,
    ids=[f"Q{q['id']:02d}" for q in QUESTIONS],
)
def test_question(client, q):
    """Execute each question's query and verify it runs without error."""
    from mcp_logan.core.query_engine import QueryEngine
    engine = QueryEngine()

    time_minutes = engine.parse_time_range(q["time_range"])
    results = client.execute_query(q["query"], time_minutes, 100, bypass_transform=True)

    assert results.get("success"), (
        f"Q{q['id']}: {q['question']}\n"
        f"Query: {q['query']}\n"
        f"Error: {results.get('error', 'unknown')}"
    )

    if q["expect_rows"]:
        assert results.get("total_count", 0) > 0, (
            f"Q{q['id']}: Expected rows but got 0 — {q['question']}"
        )


# ── Standalone runner (prints results as markdown) ────────────────────

def run_all_questions():
    """Run all 20 questions and print results. Usage: python tests/integration_questions.py"""
    os.environ.setdefault("OCI_PROFILE", "cap")
    os.environ.setdefault("OCI_REGION", "eu-frankfurt-1")

    from mcp_logan.core.client import LoganClient
    from mcp_logan.core.query_engine import QueryEngine

    client = LoganClient()
    client.initialize()
    engine = QueryEngine()

    print("# Logan MCP Integration Questions — Live Results\n")

    for q in QUESTIONS:
        time_minutes = engine.parse_time_range(q["time_range"])
        print(f"## Q{q['id']}: {q['question']}")
        print(f"```ocl\n{q['query']}\n```")
        print(f"Time range: {q['time_range']}\n")

        results = client.execute_query(q["query"], time_minutes, 100, bypass_transform=True)

        if results.get("success"):
            total = results.get("total_count", 0)
            rows = results.get("results", [])
            print(f"**{total} records** ({results.get('execution_time', 0)}ms)\n")
            if rows:
                print("```json")
                print(json.dumps(rows[:5], indent=2, default=str))
                print("```")
            else:
                print("_No matching records._")
        else:
            print(f"**ERROR:** {results.get('error', 'unknown')}")

        print()


if __name__ == "__main__":
    run_all_questions()
