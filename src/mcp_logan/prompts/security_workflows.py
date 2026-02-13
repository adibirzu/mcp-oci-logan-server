"""Security workflow prompts (6 prompts)."""

from __future__ import annotations

from typing import Any


def register_security_prompts(mcp: Any) -> None:
    """Register security workflow prompts on the FastMCP app."""

    @mcp.prompt()
    async def security_triage(
        timeRange: str = "24h",
        platform: str = "all",
    ) -> str:
        """Perform a structured security triage across detection rules and hunting queries."""
        platform_filter = f" and platform={platform}" if platform != "all" else ""
        return f"""## Security Triage Workflow

Perform a security triage for the last {timeRange} on platform: {platform}.

### Steps:
1. **Read detection catalog** — Use resource `detection://catalog` to understand available detections
2. **Run critical detections** — Use `oci_logan_search_detections` with level=critical{platform_filter}, then run each via `oci_logan_run_detection`
3. **Run high-severity detections** — Same for level=high
4. **Check hunting queries** — Read `detection://hunting/summary`, run relevant queries via `oci_logan_run_hunting_query`
5. **Correlate findings** — Use `oci_logan_correlation_analysis` for related events
6. **Summarize** — Produce a triage report with:
   - Critical findings (immediate action required)
   - High-severity findings (investigate within 4 hours)
   - Recommended response actions
   - Detection gaps identified

### Output Format:
Structured markdown with severity-sorted findings, affected assets, and recommended next steps."""

    @mcp.prompt()
    async def threat_hunt(
        hypothesis: str = "",
        platform: str = "all",
        timeRange: str = "7d",
    ) -> str:
        """Execute a hypothesis-driven threat hunting session."""
        return f"""## Threat Hunting Workflow

**Hypothesis:** {hypothesis}
**Platform:** {platform} | **Time Range:** {timeRange}

### Hunting Steps:
1. **Map hypothesis to MITRE** — Identify relevant MITRE techniques for this hypothesis
2. **Find related detections** — Use `oci_logan_search_detections` with relevant MITRE technique or keyword
3. **Read detection details** — Use resource `detection://rules/{{ruleId}}` for each relevant rule
4. **Execute detections** — Run relevant rules via `oci_logan_run_detection` with timeRange={timeRange}
5. **Run hunting queries** — Check `detection://hunting/summary` for applicable analytics queries, run via `oci_logan_run_hunting_query`
6. **Pivot and correlate** — Use `oci_logan_analyze_ip_activity` or `oci_logan_correlation_analysis` on findings
7. **Assess evidence** — Classify findings as true positive, benign, or inconclusive

### Output Format:
- Hypothesis assessment (confirmed / refuted / inconclusive)
- Evidence collected with timestamps and affected entities
- Recommended follow-up hunts
- Detection improvement suggestions"""

    @mcp.prompt()
    async def incident_investigation(
        indicator: str = "",
        indicatorType: str = "",
        timeRange: str = "7d",
    ) -> str:
        """Investigate a security incident using an IOC (indicator of compromise)."""
        return f"""## Incident Investigation Workflow

**Indicator:** {indicator}
**Indicator Type:** {indicatorType}
**Time Range:** {timeRange}

### Investigation Steps:
1. **Initial scoping** — Search for the indicator across all log sources:
   - If IP: Use `oci_logan_analyze_ip_activity` with ipAddress="{indicator}"
   - If user: Execute query `'Principal Name' = '{indicator}'` via `oci_logan_execute_query`
   - If host: Execute query `'Host Name' = '{indicator}'` via `oci_logan_execute_query`
   - If hash/file: Use `oci_logan_search_log_patterns` with pattern="{indicator}"
2. **Timeline construction** — Use `oci_logan_execute_query` with timestats to build activity timeline
3. **Lateral movement check** — Run relevant detection rules via `oci_logan_run_detection`
4. **MITRE mapping** — Use `oci_logan_get_mitre_techniques` to map observed TTPs
5. **Evidence collection** — Gather logs from all relevant sources for the affected timeframe
6. **Impact assessment** — Determine affected systems, data, and users

### Output Format:
- Executive summary (1-2 sentences)
- Timeline of events
- Affected assets and accounts
- MITRE ATT&CK techniques observed
- Containment recommendations
- Evidence preservation notes"""

    @mcp.prompt()
    async def compliance_check(
        framework: str = "stig",
        scope: str = "all",
    ) -> str:
        """Run a compliance check against STIG/DoD framework."""
        return f"""## Compliance Check Workflow

**Framework:** {framework.upper()}
**Scope:** {scope}

### Steps:
1. **Read STIG controls** — Use resource `detection://stig/controls` to get the control mapping
2. **Run compliance detections** — For each STIG control, run associated rules via `oci_logan_run_detection`
3. **Check coverage** — Use `detection://mitre/coverage` to identify gaps
4. **Assess posture** — For each control:
   - PASS: No findings from detection rules
   - FAIL: Active findings detected
   - N/A: Log source not available
5. **Generate report** — Produce compliance posture report

### Output Format:
- Overall compliance score (pass/fail/total)
- Control-by-control results table
- Failing controls with remediation guidance
- Detection gaps that need additional log sources"""

    @mcp.prompt()
    async def detection_coverage_gap(
        tactic: str = "all",
    ) -> str:
        """Analyze MITRE ATT&CK detection coverage gaps."""
        tactic_desc = "All MITRE ATT&CK tactics" if tactic == "all" else tactic
        tactic_focus = f" (focusing on {tactic})" if tactic != "all" else ""
        return f"""## Detection Coverage Gap Analysis

**Focus Tactic:** {tactic_desc}

### Steps:
1. **Read MITRE coverage** — Use resource `detection://mitre/coverage` to see current coverage
2. **Get catalog stats** — Use `oci_logan_detection_stats` for overall statistics
3. **Identify gaps** — For each tactic{tactic_focus}:
   - List techniques covered by detection rules
   - Compare against the full MITRE ATT&CK matrix
   - Identify techniques with no detection coverage
4. **Prioritize gaps** — Rank uncovered techniques by:
   - Prevalence in real-world attacks
   - Feasibility of detection with available log sources
5. **Recommend improvements** — Suggest new detection rules or log sources needed

### Output Format:
- Coverage summary by tactic (covered/total techniques)
- Gap analysis table with missing techniques
- Priority-ranked recommendations for new detections
- Log source requirements for gap closure"""

    @mcp.prompt()
    async def daily_security_brief(
        format: str = "executive",
    ) -> str:
        """Generate a daily security briefing for SOC operations."""
        if format == "executive":
            output_section = """- 3-sentence executive summary
- Key metrics dashboard (alert counts by severity)
- Top 3 items requiring attention
- Trend comparison vs. previous day"""
        else:
            output_section = """- Detailed findings for each detection category
- Event counts and affected systems
- Full detection results with raw data
- Recommended actions with priority"""

        return f"""## Daily Security Brief

**Format:** {format}

### Steps:
1. **Critical alerts** — Run all critical-level detections via `oci_logan_search_detections` (level=critical) then `oci_logan_run_detection` for each
2. **High-severity check** — Run high-level detections for the last 24h
3. **Trend analysis** — Use `oci_logan_execute_statistical_analysis` to check event volumes by log source
4. **Authentication overview** — Run authentication-related detection rules
5. **Active threats** — Check hunting queries for anomalies via `oci_logan_run_hunting_query`
6. **Health status** — Use `oci_logan_health` to verify system status

### Output Format ({format}):
{output_section}"""
