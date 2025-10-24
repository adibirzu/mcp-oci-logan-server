# Capabilities

Complete reference for all 33 MCP tools available in the OCI Logan Server.

---

## Table of Contents

1. [Query Execution Tools (4)](#query-execution-tools)
2. [Advanced Analytics Tools (5)](#advanced-analytics-tools)
3. [Resource Management Tools (10)](#resource-management-tools)
4. [Utility Tools (4)](#utility-tools)
5. [Dashboard Management Tools (7)](#dashboard-management-tools)
6. [Saved Search Tools (2)](#saved-search-tools)

---

## Tool Status Legend

- ✅ **Fully Functional** - Production ready, real OCI data
- ⚠️ **Partially Functional** - Limited implementation, some mock data
- 🚧 **In Development** - Planned but not yet implemented

---

## Query Execution Tools

### 1. execute_logan_query ✅

**Status**: Fully Functional
**Purpose**: Direct OCI Logging Analytics query execution

**Parameters**:
- `query` (string, required) - OCI query syntax
- `time_period_minutes` (number, optional) - Time range in minutes (default: 1440 = 24 hours)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Execute this query: * | stats count by 'Log Source'"

"Run a query to find failed logins in the last hour"

"Execute: 'Event Name' = 'UserLoginFailed' and Time > dateRelative(1h) | stats count by 'User Name'"
```

**Sample Output**:

```json
{
  "results": [
    {"Log Source": "Linux Syslog Logs", "count": 1234},
    {"Log Source": "OCI VCN Flow Logs", "count": 5678},
    {"Log Source": "Windows Event Logs", "count": 910}
  ],
  "total_count": 3,
  "query_time_ms": 245
}
```

**Query Syntax Tips**:
- Always capitalize `Time` field
- Quote field names with spaces: `'Log Source'`, `'Event Name'`
- Use `dateRelative()` for time filters: `Time > dateRelative(24h)`
- Use `is not null` instead of `!= null`

---

### 2. search_security_events ✅

**Status**: Fully Functional
**Purpose**: Natural language to OCI query conversion for security events

**Parameters**:
- `search_term` (string, required) - Natural language description
- `time_period` (string, optional) - "1h", "24h", "7d", "30d" (default: "24h")
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Search for failed login attempts in the last 24 hours"

"Find authentication failures from yesterday"

"Show me all security events from the last week"

"Search for network anomalies in the last hour"
```

**Supported Search Patterns**:

| Pattern | Generates Query |
|---------|-----------------|
| "failed login" | `'Event Name' = 'UserLoginFailed'` |
| "network" | `'Log Source' = 'VCN Flow Logs'` |
| "authentication" | `'Event Type' = 'Authentication'` |
| "security events" | `'Log Source' contains 'Security'` |
| "error" | `'Log Level' = 'ERROR'` |

**Sample Output**:

```json
{
  "original_query": "failed login attempts",
  "generated_query": "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'",
  "results": [
    {"User Name": "admin", "count": 15},
    {"User Name": "root", "count": 8},
    {"User Name": "service-account", "count": 3}
  ],
  "total_count": 3
}
```

---

### 3. get_mitre_techniques ✅

**Status**: Fully Functional
**Purpose**: Analyze logs for MITRE ATT&CK techniques

**Parameters**:
- `time_period` (string, optional) - Time range (default: "30d" for Sysmon data)
- `tactic` (string, optional) - Filter by specific tactic
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Show me MITRE ATT&CK techniques detected in the last 30 days"

"What MITRE techniques are in my logs?"

"Show credential access tactics"

"Get MITRE techniques for privilege escalation"
```

**Sample Output**:

```json
{
  "techniques": [
    {
      "technique_id": "T1078",
      "technique_name": "Valid Accounts",
      "tactic": "Initial Access",
      "count": 245,
      "first_seen": "2025-09-24T10:23:45Z",
      "last_seen": "2025-10-24T15:42:11Z"
    },
    {
      "technique_id": "T1110",
      "technique_name": "Brute Force",
      "tactic": "Credential Access",
      "count": 89,
      "first_seen": "2025-10-20T08:15:22Z",
      "last_seen": "2025-10-24T14:30:05Z"
    }
  ],
  "total_techniques": 2,
  "time_range": "30 days",
  "data_source": "Sysmon logs"
}
```

**Note**: Works best with Sysmon logs. Use 30-day time range for comprehensive results.

---

### 4. analyze_ip_activity ✅

**Status**: Fully Functional
**Purpose**: Analyze IP address behavior and patterns

**Parameters**:
- `ip_address` (string, required) - IP address to analyze
- `analysis_type` (string, optional) - "source", "destination", "both" (default: "both")
- `time_period` (string, optional) - Time range (default: "24h")
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Analyze activity for IP 192.168.1.100"

"What is 10.0.0.50 doing in my network?"

"Show me all activity from 203.0.113.45"

"Analyze destination traffic to 172.16.0.10"
```

**Sample Output**:

```json
{
  "ip_address": "192.168.1.100",
  "analysis_period": "24 hours",
  "summary": {
    "total_events": 1523,
    "unique_destinations": 45,
    "unique_sources": 1,
    "protocols": ["TCP", "UDP", "ICMP"],
    "top_ports": [443, 80, 22, 8080]
  },
  "source_activity": {
    "outbound_connections": 1523,
    "bytes_sent": 15234567,
    "top_destinations": [
      {"ip": "203.0.113.10", "count": 456},
      {"ip": "198.51.100.25", "count": 234}
    ]
  },
  "destination_activity": {
    "inbound_connections": 0
  },
  "anomalies": [
    "High number of connections to unique destinations",
    "Port scanning behavior detected"
  ]
}
```

---

## Advanced Analytics Tools

### 5. execute_advanced_analytics ✅

**Status**: Fully Functional
**Purpose**: Advanced analytics operations (cluster, link, nlp, classify, outlier, sequence, geostats, timecluster)

**Parameters**:
- `operation` (string, required) - Operation type
- `query` (string, required) - Base query
- `parameters` (object, optional) - Operation-specific parameters
- `time_period_minutes` (number, optional) - Time range (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Supported Operations**:

| Operation | Description | Example |
|-----------|-------------|---------|
| `cluster` | Group similar events | Cluster by error messages |
| `link` | Find relationships | Link users to accessed resources |
| `nlp` | Natural language processing | Extract entities from logs |
| `classify` | Categorize events | Classify by severity |
| `outlier` | Detect anomalies | Find unusual patterns |
| `sequence` | Ordered event analysis | User login sequences |
| `geostats` | Geographic analysis | Map IP locations |
| `timecluster` | Time-based clustering | Group events by time patterns |

**Example Usage**:

```
"Cluster security events by similarity"

"Find relationships between users and accessed files"

"Detect outliers in network traffic"

"Analyze login sequences for user admin"
```

**Sample Output (cluster)**:

```json
{
  "operation": "cluster",
  "clusters": [
    {
      "cluster_id": 1,
      "size": 234,
      "representative": "Authentication failure - invalid credentials",
      "similarity": 0.89
    },
    {
      "cluster_id": 2,
      "size": 156,
      "representative": "Network connection timeout",
      "similarity": 0.92
    }
  ],
  "total_clusters": 2,
  "coverage": "98.5%"
}
```

---

### 6. execute_statistical_analysis ✅

**Status**: Fully Functional
**Purpose**: Statistical operations (stats, timestats, eventstats, top, bottom)

**Parameters**:
- `stat_type` (string, required) - "stats", "timestats", "eventstats", "top", "bottom"
- `query` (string, required) - Base query
- `aggregation` (string, optional) - Aggregation function (count, sum, avg, min, max)
- `time_period_minutes` (number, optional) - Time range (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Show me statistics for failed logins by user"

"Get top 10 log sources by volume"

"Calculate average response time over time"

"Show bottom 5 users by activity"
```

**Sample Output (top)**:

```json
{
  "stat_type": "top",
  "limit": 10,
  "results": [
    {"Log Source": "Linux Syslog Logs", "count": 12534},
    {"Log Source": "OCI VCN Flow Logs", "count": 8765},
    {"Log Source": "Windows Event Logs", "count": 5432},
    {"Log Source": "Apache Access Logs", "count": 3210},
    {"Log Source": "MySQL Audit Logs", "count": 1987}
  ]
}
```

---

### 7. execute_field_operations ✅

**Status**: Fully Functional
**Purpose**: Field extraction, transformation, and manipulation

**Parameters**:
- `operation` (string, required) - "extract", "replace", "regex", "eval"
- `query` (string, required) - Base query
- `field_name` (string, required) - Field to operate on
- `parameters` (object, optional) - Operation-specific parameters
- `time_period_minutes` (number, optional) - Time range (default: 1440)

**Example Usage**:

```
"Extract username from log messages"

"Replace IP addresses in the message field"

"Use regex to parse error codes"

"Evaluate a new field based on existing fields"
```

---

### 8. search_log_patterns ✅

**Status**: Fully Functional
**Purpose**: Dynamic pattern detection across log data

**Parameters**:
- `pattern` (string, required) - Pattern to search for
- `log_source` (string, optional) - Specific log source
- `time_period_minutes` (number, optional) - Time range (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Search for SQL injection patterns"

"Find patterns matching 'ERROR.*database'"

"Look for IP addresses in format 192.168.*"

"Search for credit card number patterns"
```

**Sample Output**:

```json
{
  "pattern": "ERROR.*database",
  "matches": 245,
  "examples": [
    "ERROR: database connection timeout after 30s",
    "ERROR: database query failed - table not found",
    "ERROR: database authentication failed"
  ],
  "affected_sources": ["MySQL Audit Logs", "Application Logs"],
  "time_distribution": {
    "2025-10-24T14:00": 45,
    "2025-10-24T15:00": 89,
    "2025-10-24T16:00": 111
  }
}
```

---

### 9. correlation_analysis ✅

**Status**: Fully Functional
**Purpose**: Cross-log event correlation (temporal, entity, transaction)

**Parameters**:
- `correlation_type` (string, required) - "temporal", "entity", "transaction"
- `query1` (string, required) - First query
- `query2` (string, required) - Second query
- `correlation_field` (string, required) - Field to correlate on
- `time_window` (number, optional) - Correlation window in seconds (default: 300)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Correlate failed logins with account lockouts"

"Find temporal correlation between errors and restarts"

"Correlate user activity across different systems"
```

**Sample Output**:

```json
{
  "correlation_type": "temporal",
  "correlation_field": "User Name",
  "time_window_seconds": 300,
  "correlations": [
    {
      "entity": "admin",
      "event1_count": 5,
      "event2_count": 1,
      "time_difference_seconds": 45,
      "confidence": 0.95
    }
  ],
  "total_correlations": 1,
  "analysis": "5 failed login attempts followed by account lockout within 45 seconds"
}
```

---

## Resource Management Tools

### 10. list_log_sources ✅

**Status**: Fully Functional
**Purpose**: List all available log sources in OCI Logging Analytics

**Parameters**:
- `time_period_minutes` (number, optional) - Time range to check for active logs (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Show me all log sources"

"List active log sources"

"What log sources do I have?"

"Show me top 10 log sources with the most logs"
```

**Sample Output**:

```json
{
  "log_sources": [
    {
      "name": "Linux Syslog Logs",
      "log_count": 12534,
      "percentage": 35.2
    },
    {
      "name": "OCI VCN Flow Logs",
      "log_count": 8765,
      "percentage": 24.6
    },
    {
      "name": "Windows Event Logs",
      "log_count": 5432,
      "percentage": 15.3
    }
  ],
  "total_sources": 12,
  "total_logs": 35631,
  "time_period": "24 hours"
}
```

**Note**: v1.3.0 fixed this to return ALL sources (12+), not just 1-2.

---

### 11. get_log_source_details ✅

**Status**: Fully Functional
**Purpose**: Get detailed information about a specific log source

**Parameters**:
- `log_source_name` (string, required) - Name of the log source
- `time_period_minutes` (number, optional) - Time range (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Get details about Linux Syslog Logs"

"Show me information about OCI VCN Flow Logs"

"What fields are available in Windows Event Logs?"
```

**Sample Output**:

```json
{
  "log_source": "Linux Syslog Logs",
  "statistics": {
    "total_logs": 12534,
    "time_range": "24 hours",
    "log_rate_per_hour": 522
  },
  "common_fields": [
    "Log Source",
    "Host Name",
    "Severity",
    "Message",
    "Process Name",
    "Time"
  ],
  "sample_log": {
    "Log Source": "Linux Syslog Logs",
    "Severity": "INFO",
    "Message": "User admin logged in successfully",
    "Time": "2025-10-24T15:30:45Z"
  }
}
```

---

### 12. list_log_fields ✅

**Status**: Fully Functional
**Purpose**: List all available fields with filtering

**Parameters**:
- `field_type` (string, optional) - "STRING", "NUMBER", "TIMESTAMP", "all" (default: "all")
- `include_system_fields` (boolean, optional) - Include system fields (default: true)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"List all available log fields"

"Show me all string fields"

"What timestamp fields are available?"

"List custom fields only"
```

**Sample Output**:

```json
{
  "fields": [
    {
      "name": "Log Source",
      "type": "STRING",
      "is_system": true,
      "description": "Source of the log entry"
    },
    {
      "name": "Severity",
      "type": "STRING",
      "is_system": false,
      "description": "Log severity level"
    },
    {
      "name": "Time",
      "type": "TIMESTAMP",
      "is_system": true,
      "description": "Log event timestamp"
    }
  ],
  "total_fields": 150,
  "by_type": {
    "STRING": 89,
    "NUMBER": 45,
    "TIMESTAMP": 16
  }
}
```

---

### 13. get_field_details ✅

**Status**: Fully Functional
**Purpose**: Get detailed field information including cardinality

**Parameters**:
- `field_name` (string, required) - Field name
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Get details about the User Name field"

"Show me information about IP Address"

"What values does the Severity field have?"
```

**Sample Output**:

```json
{
  "field_name": "Severity",
  "field_type": "STRING",
  "is_system": false,
  "statistics": {
    "unique_values": 6,
    "total_occurrences": 12534,
    "most_common": [
      {"value": "INFO", "count": 8234, "percentage": 65.7},
      {"value": "WARN", "count": 2345, "percentage": 18.7},
      {"value": "ERROR", "count": 1234, "percentage": 9.8}
    ]
  }
}
```

---

### 14. get_namespace_info ✅

**Status**: Fully Functional
**Purpose**: Get OCI Logging Analytics namespace information

**Parameters**:
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Get namespace information"

"What is my Logging Analytics namespace?"

"Show me namespace details"
```

**Sample Output**:

```json
{
  "namespace": "your-namespace",
  "compartment_id": "ocid1.compartment.oc1..aaaaaaaa...",
  "region": "us-ashburn-1",
  "statistics": {
    "total_log_sources": 12,
    "total_entities": 45,
    "total_parsers": 89,
    "storage_used_gb": 123.4
  },
  "is_active": true,
  "created_time": "2024-01-15T10:30:00Z"
}
```

---

### 15. list_entities ✅

**Status**: Fully Functional
**Purpose**: List entities (hosts, databases, applications, webservers)

**Parameters**:
- `entity_type` (string, optional) - "host", "database", "application", "webserver", "all" (default: "all")
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"List all entities"

"Show me all hosts"

"What databases are being monitored?"

"List web servers"
```

**Sample Output**:

```json
{
  "entities": [
    {
      "name": "web-server-01",
      "type": "host",
      "entity_type": "Linux Server",
      "is_active": true,
      "log_sources": ["Linux Syslog Logs", "Apache Access Logs"]
    },
    {
      "name": "db-prod-01",
      "type": "database",
      "entity_type": "MySQL",
      "is_active": true,
      "log_sources": ["MySQL Audit Logs"]
    }
  ],
  "total_entities": 45,
  "by_type": {
    "host": 25,
    "database": 10,
    "application": 5,
    "webserver": 5
  }
}
```

---

### 16. get_storage_usage ✅

**Status**: Fully Functional
**Purpose**: Get storage usage statistics with trend analysis

**Parameters**:
- `include_trend` (boolean, optional) - Include trend analysis (default: true)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Show me storage usage"

"How much storage am I using?"

"What's my storage trend?"
```

**Sample Output**:

```json
{
  "current_usage_gb": 123.4,
  "allocated_gb": 500.0,
  "usage_percentage": 24.7,
  "trend": {
    "7_day_growth_gb": 12.3,
    "30_day_growth_gb": 45.6,
    "projected_full_date": "2026-03-15"
  },
  "by_log_source": [
    {"source": "Linux Syslog Logs", "size_gb": 45.6},
    {"source": "OCI VCN Flow Logs", "size_gb": 34.5}
  ]
}
```

---

### 17. list_parsers ✅

**Status**: Fully Functional
**Purpose**: List available log parsers

**Parameters**:
- `parser_type` (string, optional) - "REGEX", "XML", "JSON", "DELIMITED", "all" (default: "all")
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"List all parsers"

"Show me JSON parsers"

"What regex parsers are available?"
```

**Sample Output**:

```json
{
  "parsers": [
    {
      "name": "Apache Combined Log Format",
      "type": "REGEX",
      "is_system": true,
      "description": "Parses Apache combined log format"
    },
    {
      "name": "Custom JSON Parser",
      "type": "JSON",
      "is_system": false,
      "description": "Custom JSON application logs"
    }
  ],
  "total_parsers": 89,
  "by_type": {
    "REGEX": 45,
    "JSON": 23,
    "XML": 12,
    "DELIMITED": 9
  }
}
```

---

### 18. list_labels ✅

**Status**: Fully Functional
**Purpose**: List available labels for log categorization

**Parameters**:
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"List all labels"

"What labels can I use?"

"Show me available log categories"
```

---

### 19. query_recent_uploads ✅

**Status**: Fully Functional
**Purpose**: Query recent log uploads and their status

**Parameters**:
- `time_period_minutes` (number, optional) - Time range (default: 1440)
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Show me recent log uploads"

"What logs were uploaded in the last hour?"

"Check upload status"
```

**Sample Output**:

```json
{
  "uploads": [
    {
      "log_source": "Linux Syslog Logs",
      "upload_time": "2025-10-24T15:45:30Z",
      "log_count": 1234,
      "status": "SUCCESS"
    },
    {
      "log_source": "OCI VCN Flow Logs",
      "upload_time": "2025-10-24T15:30:15Z",
      "log_count": 567,
      "status": "SUCCESS"
    }
  ],
  "total_uploads": 2,
  "time_period": "1 hour"
}
```

---

## Utility Tools

### 20. get_logan_queries ✅

**Status**: Fully Functional
**Purpose**: Get predefined Logan Security Dashboard queries

**Parameters**: None

**Example Usage**:

```
"Show me available Logan queries"

"What predefined queries are available?"

"List security dashboard queries"
```

**Sample Output**:

```json
{
  "queries": [
    {
      "name": "Failed Login Attempts",
      "category": "Authentication",
      "query": "'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'"
    },
    {
      "name": "Network Anomalies",
      "category": "Network",
      "query": "'Log Source' = 'VCN Flow Logs' and Time > dateRelative(1h) | stats count by 'Source IP', 'Destination IP'"
    }
  ],
  "total_queries": 25,
  "categories": ["Authentication", "Network", "Security", "Compliance"]
}
```

---

### 21. validate_query ✅

**Status**: Fully Functional
**Purpose**: Syntax validation with auto-fix capability

**Parameters**:
- `query` (string, required) - Query to validate
- `fix` (boolean, optional) - Auto-fix common issues (default: false)

**Example Usage**:

```
"Validate this query: time > dateRelative(24h)"

"Can you check if this query is correct: * | stats count"

"Fix this query: event name = 'failed' and time != null"
```

**Sample Output**:

```json
{
  "original_query": "time > dateRelative(24h)",
  "is_valid": false,
  "errors": [
    "Field 'time' should be capitalized as 'Time'"
  ],
  "fixed_query": "Time > dateRelative(24h)",
  "suggestions": [
    "Always capitalize Time field",
    "Use quotes around field names with spaces"
  ]
}
```

---

### 22. get_documentation ✅

**Status**: Fully Functional
**Purpose**: Built-in help system

**Parameters**:
- `topic` (string, optional) - Specific topic (default: "overview")

**Example Usage**:

```
"Show me documentation"

"Help me with query syntax"

"Explain MITRE technique analysis"

"How do I use the correlation analysis tool?"
```

---

### 23. check_oci_connection ✅

**Status**: Fully Functional
**Purpose**: Test authentication and connectivity

**Parameters**:
- `compartment_id` (string, optional) - Override default compartment

**Example Usage**:

```
"Check OCI connection"

"Test authentication"

"Am I connected to OCI?"

"Verify my configuration"
```

**Sample Output**:

```json
{
  "status": "connected",
  "authentication": "oci_config_file",
  "config_location": "~/.oci/config",
  "compartment_id": "ocid1.compartment.oc1..aaaaaaaa...",
  "region": "us-ashburn-1",
  "namespace": "your-namespace",
  "connectivity_test": "passed",
  "response_time_ms": 123
}
```

---

## Dashboard Management Tools

### 24. list_dashboards ⚠️

**Status**: Partially Functional (returns sample data)
**Purpose**: List available dashboards

**Note**: Requires OCI Management Dashboard API integration (planned enhancement)

---

### 25. get_dashboard ⚠️

**Status**: Partially Functional (limited retrieval)
**Purpose**: Get dashboard definition

---

### 26. get_dashboard_tiles ⚠️

**Status**: Partially Functional
**Purpose**: Get dashboard tile configuration

---

### 27. create_dashboard ⚠️

**Status**: Mock Implementation
**Purpose**: Create new dashboard

---

### 28. update_dashboard ⚠️

**Status**: Mock Implementation
**Purpose**: Update existing dashboard

---

### 29. export_dashboard ⚠️

**Status**: Partially Functional (JSON export)
**Purpose**: Export dashboard to JSON

---

### 30. import_dashboard ⚠️

**Status**: Partially Functional (JSON import)
**Purpose**: Import dashboard from JSON

---

## Saved Search Tools

### 31. create_saved_search ⚠️

**Status**: Mock Implementation
**Purpose**: Save search query for reuse

---

### 32. list_saved_searches ⚠️

**Status**: Partially Functional (returns sample data)
**Purpose**: List saved searches

---

## Summary

| Category | Total | Fully Functional | Partial | Planned |
|----------|-------|------------------|---------|---------|
| Query Execution | 4 | 4 ✅ | 0 | 0 |
| Advanced Analytics | 5 | 5 ✅ | 0 | 0 |
| Resource Management | 10 | 10 ✅ | 0 | 0 |
| Utility | 4 | 4 ✅ | 0 | 0 |
| Dashboard Management | 7 | 0 | 7 ⚠️ | 0 |
| Saved Searches | 2 | 0 | 2 ⚠️ | 0 |
| **TOTAL** | **33** | **23** | **9** | **0** |

---

**Last Updated**: October 2025
**Version**: 1.3.0

See [Future Enhancements](Future-Enhancements) for planned improvements to dashboard and saved search tools.
