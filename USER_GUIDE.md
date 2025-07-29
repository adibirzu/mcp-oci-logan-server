# OCI MCP Logan Server - Comprehensive User Guide v1.2.0

This guide covers all **16 tools** available in the OCI MCP Logan Server v1.2.0 for advanced OCI Logging Analytics integration with Claude Desktop, including dashboard management, time correlation, and security analysis capabilities.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication Setup](#authentication-setup)
3. [Tool Usage Guide](#tool-usage-guide)
4. [Time Correlation Features](#time-correlation-features)
5. [Dashboard Management](#dashboard-management)
6. [Query Syntax Guide](#query-syntax-guide)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Quick Start

### Prerequisites Checklist
- ✅ Oracle Cloud Infrastructure (OCI) account with Logging Analytics enabled
- ✅ OCI CLI configured with appropriate permissions
- ✅ Claude Desktop installed
- ✅ Node.js 18+ and Python 3.8+

### 5-Minute Setup
```bash
# 1. Clone and build
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server
npm install && npm run build

# 2. Setup Python environment
./setup-python.sh

# 3. Configure Claude Desktop
cp claude_desktop_config.json.template claude_desktop_config.json
# Edit paths and compartment ID in the config file

# 4. Test installation
node test-server.js
```

## Authentication Setup

### Method 1: OCI CLI Configuration (Recommended)
```bash
oci setup config
```
This creates `~/.oci/config` with your credentials.

### Method 2: Environment Variables
```bash
export OCI_USER_ID="ocid1.user.oc1..aaaaaaaa[your-user-id]"
export OCI_FINGERPRINT="aa:bb:cc:dd:..."
export OCI_TENANCY_ID="ocid1.tenancy.oc1..aaaaaaaa[your-tenancy-id]"
export OCI_REGION="eu-frankfurt-1"
export OCI_KEY_FILE="/path/to/private/key.pem"
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]"
```

### Method 3: Instance Principal (OCI Compute Only)
No configuration needed - automatically detected when running on OCI instances.

### Verification
```bash
# Test connection
node test-oci-direct.js

# Expected output: "✅ Connection successful"
```

## Tool Usage Guide

### Core Query Tools

#### 🔍 `execute_logan_query`
Execute OCI Logging Analytics queries with proper time correlation.

**Basic Usage:**
```json
{
  "query": "'Event Name' = 'UserLoginFailed' | stats count by 'User Name'",
  "timeRange": "24h",
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]"
}
```

**Advanced Usage:**
```json
{
  "query": "'Log Source' = 'Windows Sysmon Events' and Technique_id != '' | fields Technique_id, 'Destination IP'",
  "queryName": "MITRE Technique Discovery",
  "timeRange": "30d",
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
  "environment": "production"
}
```

#### 🔍 `search_security_events`
Natural language security event search.

**Examples:**
```
"Find failed login attempts in the last 24 hours"
"Show privilege escalation events this week"
"Detect network anomalies in the last 6 hours"
```

**Parameters:**
- `searchTerm`: Natural language description
- `eventType`: login, privilege_escalation, network_anomaly, data_exfiltration, malware, all
- `timeRange`: Time period (default: 24h)
- `limit`: Max results (default: 100)

#### 🎯 `get_mitre_techniques`
MITRE ATT&CK technique analysis with optimized time ranges.

**Find Specific Technique:**
```json
{
  "techniqueId": "T1003",
  "timeRange": "30d"
}
```

**Find by Category:**
```json
{
  "category": "credential_access",
  "timeRange": "7d"
}
```

**Find All Techniques:**
```json
{
  "techniqueId": "all",
  "category": "all",
  "timeRange": "30d"
}
```

#### 🌐 `analyze_ip_activity`
Comprehensive IP address behavior analysis.

**Full Analysis:**
```json
{
  "ipAddress": "192.168.1.100",
  "analysisType": "full",
  "timeRange": "24h"
}
```

**Focused Analysis Types:**
- `authentication`: Login/logout events
- `network`: Network connections and traffic
- `threat_intel`: Threat intelligence correlation
- `communication_patterns`: Communication analysis

### Dashboard Management Tools

#### 📊 `list_dashboards`
Browse available dashboards in your OCI tenant.

```json
{
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
  "lifecycleState": "ACTIVE",
  "limit": 50
}
```

#### 📊 `get_dashboard`
Get complete dashboard details and configuration.

```json
{
  "dashboardId": "ocid1.dashboard.oc1..aaaaaaaa[your-dashboard-id]",
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]"
}
```

#### 📊 `create_dashboard`
Create custom security dashboards.

```json
{
  "displayName": "Security Operations Dashboard",
  "description": "Real-time security monitoring",
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
  "dashboardConfig": {
    "widgets": [
      {
        "displayName": "Failed Logins",
        "widgetType": "BAR_CHART",
        "query": "'Event Name' = 'UserLoginFailed' | stats count by 'User Name'",
        "position": {"row": 0, "column": 0, "height": 4, "width": 6}
      },
      {
        "displayName": "Top Source IPs",
        "widgetType": "PIE_CHART", 
        "query": "'Log Source' = 'VCN Flow Logs' | stats count by 'Source IP' | head 10",
        "position": {"row": 0, "column": 6, "height": 4, "width": 6}
      }
    ]
  }
}
```

#### 📤 `export_dashboard` & 📥 `import_dashboard`
Dashboard portability for backup and sharing.

**Export:**
```json
{
  "dashboardId": "ocid1.dashboard.oc1..aaaaaaaa[your-dashboard-id]",
  "includeQueries": true
}
```

**Import:**
```json
{
  "dashboardJson": "{\"version\":\"1.0\",\"dashboard\":{...}}",
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
  "newDisplayName": "Imported Security Dashboard"
}
```

### Saved Search Tools

#### 💾 `create_saved_search`
Create reusable query templates.

```json
{
  "displayName": "Suspicious Network Traffic",
  "query": "'Log Source' = 'VCN Flow Logs' and protocol = 'TCP' and action = 'REJECT'",
  "description": "Blocked TCP connections indicating potential threats",
  "widgetType": "TABLE"
}
```

#### 📋 `list_saved_searches`
Browse your saved queries.

```json
{
  "compartmentId": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
  "displayName": "security",
  "limit": 25
}
```

## Time Correlation Features

### Synchronized Time Periods
All queries use consistent time calculation for proper log correlation:

```
Time Range: 30d
Actual Period: Last 30 Days (2025-06-29 to 2025-07-29)
Data Span: 43,200 minutes exactly
```

### Cross-Log Correlation Examples

**Correlate Authentication and Network Events:**
```bash
# Step 1: Find failed logins
execute_logan_query: "'Event Name' = 'UserLoginFailed'" (24h)

# Step 2: Analyze source IPs from same period  
analyze_ip_activity: "192.168.1.100" (24h)

# Result: Both queries span identical time periods for correlation
```

**MITRE Technique Timeline:**
```bash
# Step 1: Find credential access techniques
get_mitre_techniques: "credential_access" (30d)

# Step 2: Correlate with authentication logs
search_security_events: "authentication" (30d)

# Result: Synchronized 30-day periods enable proper timeline analysis
```

### Time Range Recommendations

| Use Case | Recommended Range | Reason |
|----------|------------------|---------|
| Real-time Monitoring | 1h - 6h | Recent events |
| Daily Operations | 24h - 1d | Daily patterns |
| Weekly Analysis | 7d | Weekly trends |
| **Sysmon/MITRE Data** | **30d** | **Default OCI retention** |
| Compliance Reporting | 30d - 1m | Regulatory requirements |

## Dashboard Management

### Dashboard Workflow

1. **Discover Existing Dashboards:**
   ```bash
   list_dashboards -> Browse available dashboards
   get_dashboard -> Review configuration
   get_dashboard_tiles -> Analyze widgets
   ```

2. **Create Custom Dashboard:**
   ```bash
   create_saved_search -> Build query templates
   create_dashboard -> Assemble dashboard with widgets
   ```

3. **Maintain Dashboards:**
   ```bash
   update_dashboard -> Modify existing dashboards
   export_dashboard -> Backup configuration
   import_dashboard -> Restore or share
   ```

### Widget Types and Use Cases

| Widget Type | Best For | Example Query |
|-------------|----------|---------------|
| `LINE_CHART` | Time series trends | `timestats count by 'Event Name'` |
| `BAR_CHART` | Categorical comparisons | `stats count by 'User Name' \| head 10` |
| `PIE_CHART` | Proportional data | `stats count by protocol \| head 5` |
| `TABLE` | Detailed records | `fields Time, 'User Name', 'Event Name'` |
| `METRIC` | Single values | `stats count` |

### Dashboard Best Practices

1. **Layout Organization:**
   - Row 0: High-level metrics (4 widgets across)
   - Row 4: Detailed charts (2 larger widgets)
   - Row 8: Investigation tables (full width)

2. **Query Performance:**
   - Always include time filters
   - Use `| head 10` for top-N results
   - Filter early in query pipeline

3. **Widget Sizing:**
   - Metrics: 3x2 (width x height)
   - Charts: 6x4
   - Tables: 12x6 (full width)

## Query Syntax Guide

### Field Names and Operators
```sql
-- Quoted field names (required for spaces)
'Event Name' = 'UserLogin'
'User Name' contains 'admin'
'IP Address' in ('192.168.1.1', '10.0.0.1')

-- Time filtering (capitalized 'Time')
Time > dateRelative(24h)
Time between '2025-07-01T00:00:00Z' and '2025-07-02T00:00:00Z'

-- Logical operators
and, or, not
!=, =, contains, in, not in
```

### Common Query Patterns

**Security Event Analysis:**
```sql
-- Failed authentication attempts
'Event Name' = 'UserLoginFailed' 
and Time > dateRelative(24h) 
| stats count by 'User Name', 'Source IP' 
| sort -count

-- Privilege escalation detection
'Event Name' contains 'Privilege' 
and Time > dateRelative(7d)
| fields Time, 'User Name', 'Event Details'
| sort Time desc

-- Network anomaly detection
'Log Source' = 'VCN Flow Logs' 
and action = 'REJECT' 
and Time > dateRelative(1h)
| stats count by 'Source IP', 'Destination Port'
| where count > 10
```

**MITRE ATT&CK Queries:**
```sql
-- Technique discovery
'Log Source' = 'Windows Sysmon Events' 
and Technique_id != '' 
and Time > dateRelative(30d)
| stats count by Technique_id
| sort -count

-- Specific technique analysis
'Technique_id' = 'T1003' 
and Time > dateRelative(7d)
| fields Time, 'Source IP', 'Destination IP', 'Event Details'
```

**Performance Queries:**
```sql
-- Query optimization patterns
'Log Source' = 'Specific Source'    -- Filter first
and Time > dateRelative(24h)        -- Always include time
and field1 = 'value'                -- Specific filters early
| stats count by field2             -- Aggregation
| head 100                          -- Limit results
```

### Query Syntax Fixes

The server automatically fixes common OCI compatibility issues:

```sql
-- Automatic fixes applied:
count(*) -> count              -- OCI doesn't support count(*)
!= null -> != ""              -- Null handling
top 10 -> sort -count | head 10   -- Top command conversion
'field' -> field              -- Quote normalization
```

## Troubleshooting

### Common Issues and Solutions

#### Authentication Errors
```
Error: "Authentication failed"
Solutions:
1. Check OCI CLI: `oci iam user get --user-id <user-ocid>`
2. Verify key file permissions: `chmod 600 ~/.oci/oci_api_key.pem`
3. Test connection: `node test-oci-direct.js`
```

#### Query Syntax Errors
```
Error: "Missing input" or "Syntax error"
Solutions:
1. Use validate_query tool first
2. Check field name capitalization ('Time' not 'time')
3. Quote field names with spaces
4. Verify operator syntax (use 'contains' not 'like')
```

#### No Results Returned
```
Possible causes:
1. Time range too restrictive -> Try longer periods
2. Wrong compartment -> Verify compartment has log data
3. Log source not configured -> Check OCI Logging Analytics setup
4. Field names incorrect -> Use get_documentation for field reference
```

#### Performance Issues
```
Slow queries:
1. Add specific time filters first
2. Filter by log source early: 'Log Source' = 'Specific Source'
3. Use indexed fields for filtering
4. Limit results: | head 100
```

### Debug Tools

#### Server Debugging
```bash
# Check server functionality
node test-server.js

# Verify OCI connection
node test-oci-direct.js

# Test time correlation
node test-time-correlation.js

# Debug logs location
tail -f /tmp/mcp-debug.log
tail -f /tmp/mcp-tool-debug.log
```

#### Query Debugging
```bash
# Use validate_query tool
{
  "query": "your-query-here",
  "fix": true
}

# Check documentation
{
  "topic": "troubleshooting",
  "searchTerm": "syntax error"
}
```

## Best Practices

### Security Best Practices

1. **Compartment Access:**
   - Use specific compartment IDs, not root compartment
   - Follow principle of least privilege
   - Regularly audit access permissions

2. **Query Safety:**
   - Always include time filters to prevent excessive resource usage
   - Validate queries before execution
   - Use saved searches for tested queries

3. **Data Handling:**
   - Never log sensitive data in debug files
   - Use secure authentication methods
   - Regularly rotate API keys

### Performance Best Practices

1. **Query Optimization:**
   ```sql
   -- Good: Specific and filtered
   'Log Source' = 'Windows Sysmon Events' 
   and Time > dateRelative(24h) 
   and 'Event Name' = 'ProcessCreated'
   | head 100
   
   -- Avoid: Broad and unfiltered
   * | stats count by field
   ```

2. **Time Range Selection:**
   - Use appropriate time ranges for your use case
   - Default to 24h for regular monitoring
   - Use 30d for MITRE/Sysmon analysis
   - Avoid very long ranges (>30d) without specific filters

3. **Dashboard Performance:**
   - Limit widgets per dashboard (< 20)
   - Use efficient queries in widgets
   - Set appropriate refresh intervals
   - Cache frequently used saved searches

### Operational Best Practices

1. **Documentation:**
   - Name saved searches descriptively
   - Add descriptions to dashboards and searches
   - Document custom query logic

2. **Monitoring:**
   - Create dashboards for key security metrics
   - Set up saved searches for common investigations
   - Export important dashboards as backup

3. **Collaboration:**
   - Share dashboards via export/import
   - Use consistent naming conventions
   - Document compartment access patterns

### Error Handling Best Practices

1. **Graceful Degradation:**
   - Always provide compartment IDs explicitly
   - Handle authentication failures gracefully
   - Validate time ranges before execution

2. **Monitoring:**
   - Check debug logs regularly
   - Monitor query performance
   - Track authentication status

3. **Recovery:**
   - Keep dashboard exports as backups
   - Document working query patterns
   - Maintain alternative authentication methods

---

## Support and Resources

- **Built-in Help:** Use `get_documentation` tool
- **Test Tools:** Run `test-*.js` scripts for diagnostics
- **Debug Logs:** Check `/tmp/mcp-*.log` files
- **OCI Documentation:** [Oracle Cloud Infrastructure Logging Analytics](https://docs.oracle.com/en-us/iaas/logging-analytics/)

**Version:** 1.2.0  
**Last Updated:** July 2025