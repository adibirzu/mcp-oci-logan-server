/**
 * OCL (OCI Log Analytics Query Language) Quick Reference
 * Static content served as an MCP resource for agent consumption.
 */

export const OCL_REFERENCE = `# OCL Query Language Quick Reference

## Query Structure

OCL queries use pipe-delimited commands:
\`\`\`
<filter_expression> | <command1> | <command2> | ...
\`\`\`

## Filter Expressions

### Log Source Selection
\`\`\`
'Log Source' = 'OCI Audit Logs'
'Log Source' = 'SOC Linux Syslog Logs'
'Log Source' = 'SOC Windows Sysmon Logs'
'Log Source' = 'SOC Cloud Guard Logs'
\`\`\`

### Field Quoting Rules
- Fields with spaces MUST be single-quoted: \`'Log Source'\`, \`'Host Name'\`, \`'Event Type'\`
- Fields without spaces may be unquoted: \`Status\`, \`Severity\`, \`User\`
- String values use single quotes: \`Status = 'Failure'\`

### Comparison Operators
\`\`\`
=, !=, >, <, >=, <=
like '*pattern*'     -- wildcard match
not like '*pattern*'
in ('val1', 'val2')  -- set membership
REGEX MATCH 'pattern' -- regex match
\`\`\`

### Boolean Logic
\`\`\`
and, or, not
(condition1 or condition2) and condition3
\`\`\`

## Common Commands

### stats — Aggregate statistics
\`\`\`
| stats count by 'Log Source'
| stats count as events, avg(Size) as avg_size by 'Host Name'
| stats distinct_count('User') as unique_users by 'Client Host'
| stats sum(Size), min(Size), max(Size) by 'Log Source'
\`\`\`

### timestats — Time-bucketed statistics
\`\`\`
| timestats count by 'Log Source'
| timestats count as logrecords by 'Log Source'
| timestats span=1h count by Severity
\`\`\`

### eval — Computed fields
\`\`\`
| eval risk_score = if(Severity = 'ERROR', 10, 1)
| eval is_admin = contains('Principal Name', 'admin')
\`\`\`

### where — Post-aggregation filter
\`\`\`
| stats count as events by 'Host Name' | where events > 100
\`\`\`

### sort — Order results
\`\`\`
| sort -count           -- descending
| sort +Time            -- ascending
| sort -events, +'Host Name'
\`\`\`

### head / tail — Limit results
\`\`\`
| head 20   -- first 20 results
| tail 10   -- last 10 results
\`\`\`

### fields — Select/project fields
\`\`\`
| fields 'Host Name', 'Log Source', Severity, Time
\`\`\`

### extract — Regex field extraction
\`\`\`
| extract field=Message 'user=(?P<username>\\w+)'
\`\`\`

### cluster — Log clustering
\`\`\`
| cluster maxclusters=10 t=0.8 field=Message
\`\`\`

### link — Entity relationship graph
\`\`\`
| link 'Source IP', 'Destination IP'
\`\`\`

### outlier — Anomaly detection
\`\`\`
| outlier threshold=2
\`\`\`

### rename — Rename fields
\`\`\`
| rename 'Host Name' as hostname
\`\`\`

## Time Filters

### Relative time (recommended for most queries)
These are applied automatically by the server's timeRange parameter.
Manual usage:
\`\`\`
Time >= '2024-01-01T00:00:00Z' and Time <= '2024-01-02T00:00:00Z'
\`\`\`

### dateRelative function
\`\`\`
dateRelative(now, -24h)
dateRelative(now, -7d)
dateRelative(now, -30d)
\`\`\`

## Common Detection Patterns

### Frequency Analysis (Brute Force)
\`\`\`
'Log Source' = '<source>' and <failure_condition>
| stats count as failed by '<entity>'
| where failed > <threshold>
| sort -failed
\`\`\`

### Rare Value Stacking
\`\`\`
'Log Source' = '<source>'
| stats count by '<field>'
| where count < <threshold>
| sort count
\`\`\`

### Anomaly Scoring (Multi-indicator)
\`\`\`
'Log Source' = '<source>' and (<indicator1> or <indicator2> or ...)
| stats count as total, distinct_count('<indicator_field>') as indicators by '<entity>'
| where indicators >= <threshold>
| sort -indicators
\`\`\`

### Temporal Analysis
\`\`\`
'Log Source' = '<source>'
| timestats count by '<entity>'
| eval hourOfDay = hour(Time)
| where hourOfDay < 6 or hourOfDay > 22
\`\`\`

## OCI Audit Log Fields

| Field | Description |
|-------|-------------|
| 'Event Type' | OCI API operation (e.g., com.oraclecloud.consolesignon.login) |
| 'Request Action Type' | CRUD action (CreateInstance, DeleteBucket, etc.) |
| Status | Success/Failure |
| 'Principal Name' | User or service principal |
| 'Client Host' | Source IP address |
| 'Compartment Name' | OCI compartment |
| 'Resource Name' | Affected resource |
| 'Resource Type' | Resource type |

## Linux Syslog Fields

| Field | Description |
|-------|-------------|
| msg | Syslog message content |
| 'Client Host' | Source IP |
| User | Username |
| Hostname | Host name |
| 'Process Name' | Process that generated the log |

## Windows Sysmon Fields

| Field | Description |
|-------|-------------|
| 'Process Name' | Executable path |
| 'Command Line' | Full command line |
| 'Parent Process Name' | Parent process |
| Computer | Host name |
| 'Destination IP' | Network destination |
| Technique_id | MITRE technique ID |
`;
