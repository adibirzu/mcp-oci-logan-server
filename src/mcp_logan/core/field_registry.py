"""Field name registry per log source.

Maps correct field names for each log source as discovered from the live
OCI Logging Analytics API (CAP tenancy, 2026-03-19).

Used by the query engine and detection tools to validate/fix field
references before hitting the API.

IMPORTANT: All field names verified against live API via stats-by queries.
Fields marked INVALID were rejected by the API with HTTP 400.
"""

from __future__ import annotations

from typing import Any

# ── Per-log-source field definitions ──────────────────────────────────
# Each entry maps a log source name to its known fields.
# "common" fields are available across most log sources.

COMMON_FIELDS: list[str] = [
    "Time",
    "Log Source",
    "Entity",
    "Host Name",
    "Message",
    "Severity",
    "Label",
]

LOG_SOURCE_FIELDS: dict[str, dict[str, Any]] = {
    "OCI VCN Flow Unified Schema Logs": {
        "fields": [
            "Action",            # accept, drop, reject — unquoted OK
            "Source IP",         # QUOTED required: 'Source IP'
            "Source Port",       # QUOTED required: 'Source Port'
            "Destination IP",    # QUOTED required: 'Destination IP'
            "Destination Port",  # QUOTED required: 'Destination Port'
            "Protocol Number",   # QUOTED required: 'Protocol Number'
        ],
        "field_style": "quoted_space",
        "notes": "VCN Flow fields use 'Quoted Space' style. SourceIP (unquoted CamelCase) is INVALID.",
    },
    "OCI Audit Logs": {
        "fields": [
            "Event Type",        # 'Event Type' — works
            "User Name",         # 'User Name' — works (NOT 'Principal Name')
            "Compartment Name",  # 'Compartment Name' — works
            "Source IP",         # 'Source IP' — works
            "IP Address",        # 'IP Address' — works
            "Status",            # Status — unquoted works (200, 201, 400, etc.)
            "Resource Name",     # 'Resource Name' — works
            "Resource Type",     # 'Resource Type' — works
        ],
        "field_style": "quoted_space",
        "notes": "Audit uses 'User Name' NOT 'Principal Name'. 'Client Host' is INVALID.",
    },
    "Windows Sysmon Events": {
        "fields": [
            "Event ID",          # 'Event ID' — works (1=process, 3=network, 22=DNS)
            "Technique_id",      # Technique_id — unquoted works (but returns empty for most)
            "User",              # 'User' — works
            "User Name",         # 'User Name' — works
            "Process Name",      # 'Process Name' — works (NOT Image unquoted)
            "Command Line",      # 'Command Line' — works (NOT CommandLine unquoted)
            "Host Name",         # 'Host Name' — works
            "Destination IP",    # 'Destination IP' — works (NOT DestinationIp)
            "Source IP",         # 'Source IP' — works
            "Query Name",        # 'Query Name' — works for DNS (NOT QueryName)
        ],
        "field_style": "quoted_space",
        "notes": "Sysmon uses 'Quoted Space' style. Unquoted CamelCase (CommandLine, Image, QueryName) is INVALID.",
    },
    "OCI Cloud Guard Problems": {
        "fields": [
            "Problem Type",
            "Risk Level",
            "Resource Name",
            "Resource Type",
            "Detector",
            "Recommendation",
            "Status",
            "Region",
            "Compartment Name",
        ],
        "field_style": "quoted_space",
        "notes": "Cloud Guard fields use 'Quoted Space' style.",
    },
    "Linux Secure Logs": {
        "fields": [
            "User",
            "Source IP",
            "Service",
            "Status",
            "Command",
            "Host Name",
        ],
        "field_style": "quoted_space",
        "notes": "Linux auth logs with standard syslog fields.",
    },
}

# ── Field correction mappings per log source ──────────────────────────
# Maps commonly misused field names → correct field name per log source.
# Verified against live API — corrections prevent HTTP 400 errors.

FIELD_CORRECTIONS: dict[str, dict[str, str]] = {
    "OCI VCN Flow Unified Schema Logs": {
        # LLMs and old detection rules use unquoted CamelCase — all INVALID
        "SourceIP": "'Source IP'",
        "SourcePort": "'Source Port'",
        "DestinationIP": "'Destination IP'",
        "DestinationPort": "'Destination Port'",
        "Protocol": "'Protocol Number'",
    },
    "OCI Audit Logs": {
        # 'Principal Name' is the most common mistake
        "'Principal Name'": "'User Name'",
        "'Client Host'": "'Source IP'",
        "'Event ID'": "'Event Type'",
        "'Event Name'": "'Event Type'",
        "'Request Action Type'": "'Event Type'",
        "'Request Action'": "'Event Type'",
    },
    "Windows Sysmon Events": {
        # Unquoted CamelCase is INVALID — must use quoted
        "CommandLine": "'Command Line'",
        "Image": "'Process Name'",
        "ParentImage": "'Process Name'",
        "QueryName": "'Query Name'",
        "DestinationIp": "'Destination IP'",
        "SourceIp": "'Source IP'",
    },
}

# ── Global OCL syntax corrections ────────────────────────────────────
# These apply regardless of log source.

GLOBAL_CORRECTIONS: dict[str, str] = {
    "distinct_count(": "distinctcount(",
}


class FieldRegistry:
    """Registry of field names per log source."""

    def get_fields(self, log_source: str) -> list[str]:
        """Return all known fields for a log source (common + specific)."""
        entry = LOG_SOURCE_FIELDS.get(log_source, {})
        return COMMON_FIELDS + entry.get("fields", [])

    def get_field_style(self, log_source: str) -> str:
        """Return the field naming style for a log source."""
        entry = LOG_SOURCE_FIELDS.get(log_source, {})
        return entry.get("field_style", "quoted_space")

    def get_corrections(self, log_source: str) -> dict[str, str]:
        """Return field corrections for a log source."""
        return FIELD_CORRECTIONS.get(log_source, {})

    def validate_fields(self, query: str, log_source: str) -> list[str]:
        """Check a query for field names that don't match the log source.

        Returns a list of warnings (empty if all fields look valid).
        """
        warnings: list[str] = []
        corrections = self.get_corrections(log_source)
        for wrong, correct in corrections.items():
            if wrong in query:
                warnings.append(
                    f"Field {wrong} should be {correct} for '{log_source}'"
                )
        # Also check global corrections
        for wrong, correct in GLOBAL_CORRECTIONS.items():
            if wrong in query:
                warnings.append(f"Syntax {wrong} should be {correct}")
        return warnings

    def fix_fields(self, query: str, log_source: str) -> str:
        """Apply field corrections for a specific log source."""
        corrections = self.get_corrections(log_source)
        for wrong, correct in corrections.items():
            query = query.replace(wrong, correct)
        # Also apply global corrections
        for wrong, correct in GLOBAL_CORRECTIONS.items():
            query = query.replace(wrong, correct)
        return query

    def fix_global(self, query: str) -> str:
        """Apply global OCL syntax corrections (no log source needed)."""
        for wrong, correct in GLOBAL_CORRECTIONS.items():
            query = query.replace(wrong, correct)
        return query

    def get_all_sources(self) -> list[str]:
        """Return all known log source names."""
        return list(LOG_SOURCE_FIELDS.keys())

    def get_source_info(self, log_source: str) -> dict[str, Any] | None:
        """Return full info for a log source."""
        entry = LOG_SOURCE_FIELDS.get(log_source)
        if not entry:
            return None
        return {
            "log_source": log_source,
            "fields": COMMON_FIELDS + entry["fields"],
            "field_style": entry["field_style"],
            "notes": entry.get("notes", ""),
        }
