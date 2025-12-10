# OCI Logan Skills Guide

This guide explains how to use the Skills feature in the OCI Logan MCP server for enhanced log analysis, security auditing, and alert correlation.

## Overview

The OCI Logan MCP server provides three composable skill systems following the [skillz pattern](https://github.com/intellectronica/skillz):

| Skill | Description | Use Cases |
|-------|-------------|-----------|
| `LogAnalysisSkill` | Log search, aggregation, and pattern detection | Finding logs, analyzing trends, discovering sources |
| `SecurityAuditSkill` | Security event detection and threat analysis | Failed logins, privilege escalation, compliance |
| `AlertCorrelationSkill` | Alert grouping and root cause analysis | Incident investigation, RCA, timeline building |

## Tool Tiers

### Tier 1: Instant Operations (Zero API Calls)

These tools use Management API or cached data - instant response, minimal tokens:

| Tool | Skill | Description |
|------|-------|-------------|
| `health()` | - | Server health check |
| `list_log_sources()` | LogAnalysis | List available log sources |
| `get_log_source_summary()` | LogAnalysis | Summary with log counts |
| `list_entities()` | LogAnalysis | List log entities |
| `list_log_groups()` | LogAnalysis | List log groups |
| `get_namespace_info()` | LogAnalysis | Namespace details |
| `list_security_check_types()` | SecurityAudit | Available security checks |
| `list_correlation_patterns()` | AlertCorrelation | Correlation patterns |
| `get_priority_definitions()` | AlertCorrelation | Alert priority levels |

### Tier 2: Query Operations (API Calls)

These tools make OCI Log Analytics queries - 1-30 second response:

| Tool | Skill | Description |
|------|-------|-------------|
| `search_logs()` | LogAnalysis | Execute log search query |
| `aggregate_logs()` | LogAnalysis | Aggregate by field |
| `get_log_trends()` | LogAnalysis | Log volume over time |
| `get_top_errors()` | LogAnalysis | Top error messages |
| `run_security_check()` | SecurityAudit | Run security check |
| `get_threat_summary()` | SecurityAudit | Threat overview |
| `detect_failed_logins()` | SecurityAudit | Failed login detection |
| `detect_privilege_escalation()` | SecurityAudit | Privilege escalation |
| `run_compliance_check()` | SecurityAudit | Compliance assessment |
| `correlate_alerts()` | AlertCorrelation | Group related alerts |
| `build_incident_timeline()` | AlertCorrelation | Build event timeline |
| `analyze_root_cause()` | AlertCorrelation | RCA analysis |
| `get_alert_statistics()` | AlertCorrelation | Alert statistics |

---

## LogAnalysisSkill

### Purpose
Search, aggregate, and analyze logs from OCI Logging Analytics.

### Recommended Workflow

1. **Start with discovery (Tier 1)**:
   ```python
   list_log_sources()
   # → Lists all available log sources
   
   get_log_source_summary(time_range_minutes=60)
   # → Shows active sources with log counts
   ```

2. **Search for specific logs (Tier 2)**:
   ```python
   search_logs(
       query="* | where contains('Severity', 'error')",
       time_range_minutes=60,
       max_results=100
   )
   ```

3. **Aggregate for patterns**:
   ```python
   aggregate_logs(
       group_by_field="Log Source",
       time_range_minutes=1440
   )
   ```

4. **Analyze trends**:
   ```python
   get_log_trends(
       time_range_minutes=1440,
       interval_minutes=60
   )
   ```

### Query Syntax

OCI Logging Analytics uses a pipe-based query language:

```
* | where <condition> | stats <aggregation> | sort <field> | head <n>
```

Examples:
- `*` - All logs
- `'Log Source' = "OCI VCN Flow Unified Schema Logs"` - Filter by source
- `* | where contains('Message', 'error')` - Text search
- `* | stats count by 'Severity'` - Aggregation
- `* | sort -Datetime | head 10` - Latest 10 logs

---

## SecurityAuditSkill

### Purpose
Detect security events, analyze threats, and assess compliance.

### Available Security Check Types

| Check Type | Description | Severity |
|------------|-------------|----------|
| `failed_logins` | Failed login attempts | High |
| `successful_logins` | Successful logins | Info |
| `privilege_escalation` | sudo/su/role assumptions | Critical |
| `suspicious_network` | Blocked/refused connections | High |
| `port_scanning` | Port scan attempts | Medium |
| `audit_changes` | Configuration changes | Medium |
| `user_management` | User create/delete/update | Medium |
| `high_volume_requests` | Unusual API volume | Medium |
| `cloud_guard` | Cloud Guard findings | High |
| `security_events` | General security events | Medium |

### Recommended Workflow

1. **List available checks (Tier 1)**:
   ```python
   list_security_check_types()
   # → Shows all check types with descriptions
   ```

2. **Run a specific check (Tier 2)**:
   ```python
   run_security_check(
       check_type="failed_logins",
       time_range_minutes=60
   )
   # → Returns events with recommendations
   ```

3. **Get threat overview**:
   ```python
   get_threat_summary(time_range_minutes=1440)
   # → Aggregated threat stats across all types
   ```

4. **Detailed detection**:
   ```python
   detect_failed_logins(
       time_range_minutes=60,
       threshold=5  # Flag IPs with >5 failures
   )
   ```

5. **Run compliance check**:
   ```python
   run_compliance_check(time_range_minutes=1440)
   # → Returns pass/fail/warning for each category
   ```

---

## AlertCorrelationSkill

### Purpose
Group related alerts, build incident timelines, and perform root cause analysis.

### Priority Levels

| Priority | Name | Response Time | Examples |
|----------|------|---------------|----------|
| P1 | Critical | 15 minutes | Service outage, data breach |
| P2 | High | 1 hour | Service degradation, security warning |
| P3 | Medium | 4 hours | Non-critical errors, performance issues |
| P4 | Low | 24 hours | Warning conditions, minor issues |
| P5 | Info | As needed | Status updates, audit logs |

### Correlation Patterns

The skill recognizes these event categories for correlation:
- **database**: ORA-, database, SQL, connection, timeout
- **network**: connection, timeout, refused, unreachable, DNS
- **authentication**: login, auth, password, credential, denied
- **storage**: disk, storage, space, I/O, volume
- **application**: error, exception, crash, restart, OOM
- **security**: attack, blocked, firewall, malicious, threat

### Recommended Workflow

1. **View correlation patterns (Tier 1)**:
   ```python
   list_correlation_patterns()
   # → Shows keywords for each category
   
   get_priority_definitions()
   # → Priority level descriptions
   ```

2. **Correlate recent alerts (Tier 2)**:
   ```python
   correlate_alerts(
       time_range_minutes=60,
       correlation_window_minutes=5,
       min_events=2
   )
   # → Groups related events with probable causes
   ```

3. **Build incident timeline**:
   ```python
   build_incident_timeline(
       search_query="'Log Source' = 'Database Alert Logs'",
       time_range_minutes=60
   )
   # → Ordered timeline of events
   ```

4. **Perform RCA**:
   ```python
   analyze_root_cause(
       primary_symptom="ORA-12170",
       time_range_minutes=60
   )
   # → Probable causes with confidence scores
   ```

5. **Get statistics**:
   ```python
   get_alert_statistics(time_range_minutes=1440)
   # → Alert volume by severity, source, time
   ```

---

## Skill Discovery

Use the skill discovery tools to find the right approach:

```python
# List all skills
list_available_skills()

# Get skill recommendation for a query
get_skill_for_query("What failed logins happened today?")
# → Recommends SecurityAuditSkill with detect_failed_logins
```

---

## Token Optimization Best Practices

1. **Start with Tier 1 tools** - Use discovery tools before queries
2. **Use time filters** - Limit time ranges to reduce data volume
3. **Use aggregations** - Use `aggregate_logs` instead of raw searches when possible
4. **Limit results** - Use `max_results` and `limit` parameters
5. **Cache results** - Reuse discovery results for multiple queries

---

## Server Manifest

Access the server manifest for capability discovery:

```python
# Access via resource
mcp.access_resource("server://manifest")
```

The manifest provides:
- Server version and capabilities
- Available skills
- Tool categorization by tier
- Usage guide
- Environment variables

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LOGAN_COMPARTMENT_ID` | Default compartment OCID | Yes |
| `LOGAN_REGION` | OCI region (e.g., us-ashburn-1) | Yes |
| `OCI_CONFIG_FILE` | Path to OCI config file | No (defaults to ~/.oci/config) |
| `LOGAN_DEBUG` | Enable debug logging | No |

---

## Example Workflows

### Security Incident Investigation

```python
# 1. Check for security events in last hour
threat_summary = get_threat_summary(time_range_minutes=60)
# Review critical_alerts

# 2. If failed logins detected, get details
if threat_summary["by_type"]["failed_logins"] > 0:
    logins = detect_failed_logins(time_range_minutes=60, threshold=3)
    # Review flagged_ips

# 3. Correlate with other events
alerts = correlate_alerts(time_range_minutes=60)
# Review correlated_alerts with priority P1/P2

# 4. If incident confirmed, build timeline
timeline = build_incident_timeline(
    search_query="* | where contains('Source IP', '10.0.0.5')",
    time_range_minutes=120
)
```

### Log Analysis Workflow

```python
# 1. Discover active sources
summary = get_log_source_summary(time_range_minutes=60)
# Review top_sources

# 2. Check for errors
errors = get_top_errors(time_range_minutes=60)
# Review error patterns

# 3. Aggregate by source
aggregation = aggregate_logs(
    group_by_field="Log Source",
    time_range_minutes=60
)

# 4. Search specific logs
results = search_logs(
    query="'Log Source' = 'Database Alert Logs' | where contains('Message', 'ORA-')",
    time_range_minutes=1440
)
```

### Root Cause Analysis

```python
# 1. Start with symptom
rca = analyze_root_cause(
    primary_symptom="connection timeout",
    time_range_minutes=60
)
# Review probable_causes and confidence_score

# 2. Correlate related alerts
alerts = correlate_alerts(time_range_minutes=60)
# Find patterns across sources

# 3. Build timeline
timeline = build_incident_timeline(
    search_query="* | where contains('Message', 'timeout')",
    time_range_minutes=60
)

# 4. Follow recommendations
for rec in rca["recommendations"]:
    print(f"- {rec}")
```
