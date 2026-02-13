"""Query transformation, time injection, and validation.

Merged from python/query_validator.py with critical bug fixes:
- FIX: Removed hardcoded 2-source available_log_sources list
- FIX: Log source alias mapping for detection rules
- FIX: Accepts all source names (dynamic discovery)
"""

from __future__ import annotations

import re
from typing import Any

from mcp_logan.core.observability import get_logger

log = get_logger("query_engine")

# Log source aliases — detection rules may reference different names
# for the same underlying data. When a query returns zero results,
# the engine retries with the alias.
LOG_SOURCE_ALIASES: dict[str, list[str]] = {
    "SOC Cloud Guard Logs": ["SOC Cloud Guard Logs", "OCI Cloud Guard Problems"],
    "SOC Linux Syslog Logs": ["SOC Linux Syslog Logs", "Linux Secure Logs"],
    "SOC Windows Sysmon Logs": ["SOC Windows Sysmon Logs", "Windows Sysmon Events"],
    "Windows Sysmon Operational Logs": ["Windows Sysmon Operational Logs", "Windows Sysmon Events"],
}

# Patterns that indicate a query should be preserved as-is
PRESERVE_PATTERNS = [
    "lookup table",
    "com.oraclecloud.logging.custom",
    "rename",
    "eval vol = unit",
    "geostats",
    "highlightgroups",
    "classify",
    "timestats",
    "link span",
    "'Web Application Firewall",
    "compare timeshift",
    "OCI WAF Logs",
    "Request Protection Rule IDs",
    "Host IP Address (Client)",
    "Suricata",
    "Windows Sysmon",
    "User Agent",
    "Response Code",
]

# Patterns that should skip time filter injection
SKIP_TIME_FILTER_PATTERNS = [
    "lookup table",
    "com.oraclecloud.logging.custom",
    "eval vol = unit",
    "geostats",
    "highlightgroups",
    "classify",
    "timestats",
    "link span",
    "compare timeshift",
    "fields SuricataSignature",
    "Request Protection Rule IDs",
]

# NL/SQL → proper OCL mappings for small LLMs
NL_QUERY_PATTERNS: dict[str, dict[str, Any]] = {
    "log_sources": {
        "patterns": [
            "log source", "log_source", "logsource", "list log",
            "show log", "get log", "log types", "select log",
            "from logs", "SELECT", "FROM", "stats count(log",
        ],
        "query": "* | stats count as logrecords by 'Log Source' | sort -logrecords",
    },
    "errors": {
        "patterns": [
            "severity = 'error'", "severity=error", "find error",
            "show error", "get error", "list error",
        ],
        "query": "Severity = 'error'",
    },
    "top_errors": {
        "patterns": ["top error", "most error", "common error", "frequent error"],
        "query": "Severity = 'error' | stats count by Message | sort -count | head 10",
    },
    "db_alerts": {
        "patterns": ["database alert", "db alert", "oracle alert", "database instance"],
        "query": "'Entity Type' = 'Database Instance' AND Severity IN ('error', 'fatal') | stats count by Target",
    },
}


class QueryEngine:
    """Transforms, validates, and fixes OCL queries."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transform(self, query: str) -> str:
        """Full transformation pipeline: normalize → fix → validate."""
        # Step 0: NL / SQL normalization
        normalized = self._normalize_llm_query(query)
        if normalized:
            log.debug("query_normalized", original=query[:80], result=normalized[:80])
            return normalized

        # Step 1: Check if query should be preserved
        if self._should_preserve(query):
            return self._minimal_fixes(query)

        # Step 2: Fix syntax
        fixed = self._fix_basic_syntax(query)

        # Step 3: Fix field references
        fixed = self._fix_field_references(fixed)

        if fixed != query:
            log.debug("query_transformed", original=query[:80], result=fixed[:80])

        return fixed

    def add_time_filter(self, query: str, time_period_minutes: int) -> str:
        """Inject dateRelative() time filter if the query doesn't already have one."""
        if self._has_time_filter(query):
            return query

        if self._should_skip_time_filter(query):
            return query

        time_unit = self._minutes_to_unit(time_period_minutes)
        time_filter = f"Time > dateRelative({time_unit})"

        if query.strip() == "*":
            return f"* | where {time_filter} | stats count as logrecords by 'Log Source' | sort -logrecords"

        if "|" in query:
            first_pipe = query.index("|")
            before = query[:first_pipe].strip()
            after = query[first_pipe:]
            return f"{before} and {time_filter} {after}"

        return f"{query} and {time_filter}"

    def get_log_source_aliases(self, source_name: str) -> list[str]:
        """Return alternative log source names for a given source."""
        return LOG_SOURCE_ALIASES.get(source_name, [])

    def replace_log_source(self, query: str, old_source: str, new_source: str) -> str:
        """Replace a log source name in a query."""
        return query.replace(f"'{old_source}'", f"'{new_source}'")

    # ------------------------------------------------------------------
    # Time helpers
    # ------------------------------------------------------------------

    @staticmethod
    def parse_time_range(time_range: str) -> int:
        """Convert human time range string to minutes."""
        mapping = {
            "1h": 60, "6h": 360, "12h": 720,
            "24h": 1440, "1d": 1440,
            "7d": 10080, "1w": 10080,
            "30d": 43200, "1m": 43200,
            "90d": 129600,
        }
        return mapping.get(time_range, 1440)

    @staticmethod
    def _minutes_to_unit(minutes: int) -> str:
        if minutes < 60:
            return f"{minutes}m"
        if minutes < 1440:
            return f"{minutes // 60}h"
        return f"{minutes // 1440}d"

    # ------------------------------------------------------------------
    # NL normalization
    # ------------------------------------------------------------------

    def _normalize_llm_query(self, query: str) -> str | None:
        lower = query.lower().strip()

        # SQL-like patterns
        if re.search(r"\bselect\b", lower) or re.search(r"\bfrom\s+logs?\b", lower):
            for cfg in NL_QUERY_PATTERNS.values():
                for pattern in cfg["patterns"]:
                    if pattern.lower() in lower:
                        return cfg["query"]
            return NL_QUERY_PATTERNS["log_sources"]["query"]

        # Natural language patterns
        for cfg in NL_QUERY_PATTERNS.values():
            for pattern in cfg["patterns"]:
                if pattern.lower() in lower:
                    return cfg["query"]

        return None

    # ------------------------------------------------------------------
    # Syntax fixes
    # ------------------------------------------------------------------

    def _should_preserve(self, query: str) -> bool:
        return any(p in query for p in PRESERVE_PATTERNS)

    def _should_skip_time_filter(self, query: str) -> bool:
        return any(p in query for p in SKIP_TIME_FILTER_PATTERNS)

    def _has_time_filter(self, query: str) -> bool:
        q = query.lower()
        return "where" in q and any(
            kw in q for kw in ("datetime", "time ", "timestamp", "daterelative", "timefilter")
        )

    @staticmethod
    def _minimal_fixes(query: str) -> str:
        """Only null-check and quote fixes for complex queries."""
        query = query.replace("!= null", '!= ""')
        query = query.replace("is not null", '!= ""')
        query = query.replace("== null", "is null")
        query = query.replace("(drop, reject)", "('drop', 'reject')")
        query = query.replace("(accept, allow)", "('accept', 'allow')")
        return query

    def _fix_basic_syntax(self, query: str) -> str:
        """Fix common OCI Logging Analytics syntax issues."""
        query = self._minimal_fixes(query)

        # top N count → sort + head
        query = re.sub(r"\|\s*top\s+(\d+)\s+[Cc]ount", r"| sort -Count | head \1", query)
        query = query.replace("| top Count", "| sort -Count | head 10")

        # stats count(*) → stats count
        query = query.replace("stats count(*)", "stats count")

        # Remove problematic rename commands
        if "| rename " in query:
            rename_pos = query.find("| rename ")
            pipe_after = query.find(" | ", rename_pos + 1)
            if pipe_after > 0:
                query = query[:rename_pos] + " " + query[pipe_after:]
            else:
                query = query[:rename_pos].strip()

        # Remove invalid search commands
        if "| search " in query.lower():
            search_pos = query.lower().find("| search ")
            if search_pos >= 0:
                query = query[:search_pos].strip()

        return query

    @staticmethod
    def _fix_field_references(query: str) -> str:
        """Fix field name quoting/mapping."""
        mappings = {
            "'Event ID'": "'Event Type'",
            "'Source IP'": "SourceIP",
            "'Source Port'": "SourcePort",
            "'Destination IP'": "DestinationIP",
            "'Destination Port'": "DestinationPort",
        }
        for old, new in mappings.items():
            query = query.replace(old, new)
        return query
