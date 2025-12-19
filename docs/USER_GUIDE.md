# OCI Logan MCP Server - User Guide v1.3.0

## 🚨 Important Update - v1.3.0

**CRITICAL FIX APPLIED**: The `list_active_log_sources` tool now returns **complete, accurate results** matching the OCI Console exactly!

**Before v1.3.0**: Resource discovery questions returned only 1-2 sources (incomplete)
**After v1.3.0**: Returns ALL 12+ active sources with accurate log counts (complete)

This guide shows you how to get the most out of your OCI Logan MCP server.

## How to Ask Questions Effectively

The OCI Logan MCP server enables Claude to query and analyze your OCI Logging Analytics data. This guide explains how to interact with the MCP server for optimal results.

## 📋 Quick Start Checklist

Before asking questions, ensure:
1. ✅ OCI CLI is configured (`oci iam region list` should work)
2. ✅ Python virtual environment is set up (`./setup-python.sh`)
3. ✅ Claude Desktop config includes correct compartment ID and region
4. ✅ You have access to the OCI compartment with Logging Analytics data
5. ✅ **v1.3.0 or later installed** (for complete results)

## 🎯 Best Practices for Asking Questions

### ✅ DO: Ask Natural Language Questions

The MCP server is designed to understand natural language queries. Examples:

```
"Show me failed login attempts in the last 24 hours"
"Find all credential access techniques from MITRE ATT&CK in the last 30 days"
"Analyze activity for IP address 192.168.1.100"
"What security events happened yesterday?"
"List all available log sources in my environment"
```

### ✅ DO: Be Specific About Time Ranges

The server understands various time expressions:

```
"Show me logs from the last hour"
"Find errors in the past 7 days"
"Get authentication events from the last 30 days"
"What happened in the last week?"
```

**Supported time ranges:**
- 1h, 6h, 12h, 24h (hours)
- 1d, 7d, 30d (days)
- 1w, 2w (weeks)
- 1m (month)

**Important:** For MITRE ATT&CK/Sysmon data, use at least **30 days** time range for meaningful results.

### ✅ DO: Ask About Specific Security Events

The server has built-in understanding of common security patterns:

```
"Find privilege escalation attempts"
"Show me network anomalies"
"Detect potential data exfiltration"
"Find malware-related events"
"Show administrator login activity"
```

### ✅ DO: Use Resource Discovery Questions

The server can help you understand what's available in your OCI Logging Analytics:

```
"What log sources are available?"
"Show me all log fields"
"List entities in my environment"
"What parsers are configured?"
"Show storage usage statistics"
"What labels are available for categorization?"
```

### ❌ DON'T: Ask About Dashboard Management (Limited)

Dashboard creation and modification tools are **partially implemented** and may return mock data:

```
❌ "Create a new dashboard for security monitoring"
❌ "Update my existing dashboard"
⚠️  "List dashboards" (returns sample data, not real dashboards)
```

### ❌ DON'T: Expect Real-Time Alerts

The MCP server queries historical data. It doesn't provide real-time alerting or monitoring.

### ❌ DON'T: Ask About Non-OCI Data Sources

The server only accesses OCI Logging Analytics data in your configured compartment.

## 🔍 Types of Questions the MCP Server Handles Well

### 1. Security Event Analysis

```
"Find all failed authentication attempts from external IPs"
"Show me privilege escalation events grouped by user"
"Detect lateral movement patterns in my network"
"What are the most common security events?"
```

### 2. MITRE ATT&CK Investigation

```
"Show all MITRE techniques detected in the last month"
"Find credential access techniques (T1003)"
"What execution techniques have been observed?"
"Show me all tactics by frequency"
```

### 3. IP Address Investigation

```
"Analyze all activity for IP 10.0.1.50"
"Show authentication attempts from 203.0.113.45"
"What network connections involve 192.168.1.100?"
"Find communication patterns for this IP address"
```

### 4. User Behavior Analysis

```
"Show me activity for user 'admin' in the last week"
"Find users with unusual login patterns"
"What are the most active users?"
"Detect anomalous user behavior"
```

### 5. Resource Discovery

```
"What log sources are actively sending data?"
"List all available fields for querying"
"Show me entities of type 'host'"
"What parsers are available for JSON logs?"
"Show recent log uploads and their status"
```

### 6. Advanced Analytics

```
"Cluster security alerts to find patterns"
"Detect outliers in user activity"
"Show time-based clustering of events"
"Correlate authentication events with network activity"
"Find sequences of suspicious events"
```

## 🛠️ Understanding MCP Tools

The server provides **33 specialized tools** that Claude uses automatically:

### Core Query Tools (4 tools)
- **execute_logan_query** - Direct OCI query execution
- **search_security_events** - Natural language security search
- **get_mitre_techniques** - MITRE ATT&CK analysis
- **analyze_ip_activity** - IP behavioral analysis

### Advanced Analytics (5 tools)
- **execute_advanced_analytics** - ML-powered analysis (clustering, NLP, outliers)
- **execute_statistical_analysis** - Statistical operations
- **execute_field_operations** - Field extraction and transformation
- **search_log_patterns** - Dynamic pattern detection
- **correlation_analysis** - Cross-log event correlation

### Resource Management (10 tools)
- **list_log_sources** - Available log sources
- **get_log_source_details** - Detailed source information
- **list_log_fields** - Available query fields
- **get_field_details** - Field metadata
- **get_namespace_info** - Namespace information
- **list_entities** - Entities (hosts, databases, etc.)
- **get_storage_usage** - Storage statistics
- **list_parsers** - Available log parsers
- **list_labels** - Categorization labels
- **query_recent_uploads** - Recent log uploads

### Dashboard Tools (7 tools - Partially Implemented ⚠️)
- list_dashboards, get_dashboard, create_dashboard, etc.
- **Note:** These return sample/mock data in current version

### Utility Tools (4 tools)
- **get_logan_queries** - Predefined query templates
- **validate_query** - Query syntax validation
- **get_documentation** - Built-in help system
- **check_oci_connection** - Authentication testing

### Saved Search Tools (3 tools - Mixed Implementation)
- create_saved_search (Mock), list_saved_searches (Mock), export_dashboard

## 📊 Example Conversation Flow

### Discovery Phase
```
User: "What log sources are available in my environment?"
Claude: [Uses list_active_log_sources tool - v1.3.0 fix!]
Claude: "I found 12 active log sources with data in the last 60 minutes:

        1. OCI Audit Logs: 14,623 logs
        2. Database XML Alert Logs: 8,464 logs
        3. OCI Cloud Guard Problems: 6,721 logs
        4. OCI VCN Flow Unified Schema Logs: 5,840 logs
        5. OCI Service Connector Hub Logs: 2,656 logs
        6. Database Alert Logs: 593 logs
        7. OCI WAF Logs: 119 logs
        8. com.oraclecloud.dns.private.resolver: 116 logs
        9. Database Trace Logs: 84 logs
        10. OCI Events Logs: 41 logs
        11. OCI Object Storage Access Logs: 14 logs
        12. OCI_Monitoring: 12 logs

        Total: 39,363 logs across all sources"

User: "Show me what fields I can query"
Claude: [Uses list_log_fields tool]
Claude: "Here are the available fields: 'Event Name', 'User Name',
        'IP Address', 'Technique_id', 'Log Source', etc."
```

**Note**: The complete log source listing is thanks to the v1.3.0 critical fix!

### Investigation Phase
```
User: "Find failed login attempts in the last 24 hours"
Claude: [Uses search_security_events tool]
Claude: "I found 47 failed login attempts. Top 3 users:
        - admin: 23 attempts from 203.0.113.45
        - dbuser: 12 attempts from 10.0.1.50
        - testuser: 8 attempts from 192.168.1.100"

User: "Analyze the IP 203.0.113.45"
Claude: [Uses analyze_ip_activity tool]
Claude: "This IP shows suspicious behavior:
        - 23 failed authentication attempts
        - Connections to 5 different hosts
        - No successful logins observed"
```

### Deep Analysis Phase
```
User: "Are there any MITRE techniques associated with this activity?"
Claude: [Uses get_mitre_techniques tool]
Claude: "Found the following MITRE techniques:
        - T1110 (Brute Force) - 23 events
        - T1078 (Valid Accounts) - 5 events
        - T1021 (Remote Services) - 3 events"
```

## 🔧 Troubleshooting

### "Getting incomplete log source list" (Only 1-2 sources shown)

**This indicates you're running an older version!**

**Symptom**: When asking "What log sources are available?", you only see 1-2 sources, but your OCI Console shows 12+ sources.

**Cause**: You're running a version before v1.3.0 that had the incomplete results bug.

**Solution**:
```bash
cd /path/to/mcp-oci-logan-server
git pull  # If using git
npm run build
# Restart Claude Desktop
```

**Verify the fix**: Ask Claude:
```
"What log sources are available in my environment?"
```
You should now see ALL 12+ active sources with their log counts.

### "No results returned"

**Possible causes:**
1. Time range too narrow (especially for MITRE data - use 30d+)
2. Incorrect compartment ID in configuration
3. Log sources not configured in OCI Logging Analytics
4. No data ingested for the specified time period

**Solutions:**
```
"Check my OCI connection status"
"What log sources are actively sending data?"
"Show me recent log uploads"
"List entities in my environment"
```

### "Query syntax error"

**Solution:**
```
"Validate this query: [your query]"
"Show me the documentation for query syntax"
```

### "Authentication failed"

**Solution:**
1. Test OCI CLI: `oci iam region list`
2. Check config: `cat ~/.oci/config`
3. Ask Claude: `"Check my OCI connection and tell me if there are any issues"`

### "Dashboard tools not working"

**Expected behavior:** Dashboard management tools (create, update, list) are partially implemented and may return sample data. This is a known limitation documented in the README.

## 🎓 Learning More

### Get Built-in Help
```
"Show me documentation for query syntax"
"Get help with MITRE technique mapping"
"Show me examples of field operations"
"What functions are available for queries?"
```

### Explore Predefined Queries
```
"Show me all available security queries"
"List MITRE ATT&CK query templates"
"What authentication monitoring queries are available?"
```

### Test Your Setup
```
"Run a connection test"
"Validate my OCI configuration"
"Show me namespace information"
"What's my storage usage?"
```

## 🚀 Advanced Usage Patterns

### Correlation Analysis
```
"Correlate failed logins with network connection attempts in the same time window"
"Find sequences of privilege escalation followed by data access"
"Link authentication events to resource modifications"
```

### Statistical Analysis
```
"Show me authentication patterns by hour of day"
"Calculate Z-scores for error frequencies"
"Find outliers in user activity"
"Analyze percentiles of response times"
```

### Pattern Detection
```
"Cluster security alerts to identify attack patterns"
"Detect temporal event patterns"
"Find geographic patterns in network traffic"
"Identify communication sequences"
```

## 📝 Tips for Best Results

1. **Start broad, then narrow:** Begin with discovery questions, then focus on specific events
2. **Use appropriate time ranges:** 24h for recent events, 30d+ for MITRE data
3. **Leverage natural language:** Don't worry about exact query syntax
4. **Chain questions:** Build on previous answers for deeper investigation
5. **Verify assumptions:** Ask about available resources before querying specific data
6. **Use validation:** If you write custom queries, ask Claude to validate them first

## ⚙️ Configuration Tips

### Recommended Claude Desktop Configuration

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "[Link to Secure Variable: OCI_COMPARTMENT_ID]",
        "OCI_REGION": "us-ashburn-1",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
```

**Environment Variables:**
- `OCI_COMPARTMENT_ID` - **Required** - Your OCI compartment OCID
- `OCI_REGION` - **Recommended** - Default: us-ashburn-1
- `LOGAN_DEBUG` - Enable debug logging (set to "true")
- `LOGAN_PROJECT_PATH` - Optional path to Logan Security Dashboard project

### Enable Debug Mode

For troubleshooting, enable debug mode:

```json
"LOGAN_DEBUG": "true"
```

Then check Claude Desktop logs at:
- Mac: `~/Library/Logs/Claude/`
- Check system console for MCP server output

## 🆘 Getting Help

If you encounter issues:

1. **Test basics:**
   ```
   "Check my OCI connection"
   "Show me namespace information"
   "List available log sources"
   ```

2. **Check configuration:**
   - Verify `~/.oci/config` exists
   - Confirm compartment ID is correct
   - Test OCI CLI: `oci iam region list`

3. **Review logs:**
   - Enable `LOGAN_DEBUG: "true"`
   - Check Claude Desktop logs
   - Look for authentication or permission errors

4. **Verify data availability:**
   ```
   "Show me recent log uploads"
   "What log sources are active?"
   "List entities in my environment"
   ```

## 📚 Additional Resources

- **OCI Query Syntax:** Ask Claude: `"Show me documentation for query syntax"`
- **MITRE ATT&CK:** Ask Claude: `"Get help with MITRE technique mapping"`
- **Field Reference:** Ask Claude: `"List all available log fields"`
- **Query Examples:** Ask Claude: `"Show me security query examples"`

## 🔍 Verifying Your Installation

### Check Your Version

To verify you have v1.3.0 or later with the critical fix:

```bash
cd /path/to/mcp-oci-logan-server
grep "Version" README.md | head -1
```

Should show: `**Version**: 1.3.0`

### Test the Fix

After installing v1.3.0, restart Claude Desktop and ask:

```
"What log sources are available in my environment?"
```

**Expected result (v1.3.0+)**:
- Shows 12+ active sources with individual log counts
- Matches your OCI Console exactly
- Total log count displayed

**Old behavior (pre-v1.3.0)**:
- Shows only 1-2 sources (incomplete)
- Missing most of your log sources

If you still see incomplete results, run `npm run build` again and restart Claude Desktop.

## 📝 Quick Reference Card

### Most Useful Questions

**Resource Discovery**:
```
"What log sources are available?"
"Show me all available fields"
"List entities in my environment"
```

**Security Investigation**:
```
"Show me failed login attempts in the last 24 hours"
"Find MITRE techniques in the last 30 days"
"Analyze activity for IP [address]"
```

**Advanced Analysis**:
```
"Cluster security alerts to find patterns"
"Correlate authentication events with network activity"
"Detect outliers in user behavior"
```

**Getting Help**:
```
"Show me documentation for query syntax"
"Validate this query: [query]"
"Check my OCI connection"
```

---

**Remember:** The MCP server is designed to be conversational. You don't need to memorize commands or syntax - just ask natural language questions, and Claude will use the appropriate tools automatically!

**Version**: v1.3.0 with complete results fix 🚨
