# Claude Desktop MCP Server Setup - OCI Logan

## ✅ Setup Complete

The MCP server has been successfully added to your Claude Desktop configuration!

## Configuration Details

**Server Name:** `oci-logan`
**Location:** `/Users/abirzu/dev/mcp-oci-logan-server/dist/index.js`
**Config File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Environment Variables Set

- `OCI_COMPARTMENT_ID`: ocid1.tenancy.oc1..aaaaaaaaxzpxbcag7zgamh2erlggqro3y63tvm2rbkkjz4z2zskvagupiz7a
- `OCI_REGION`: eu-frankfurt-1
- `SUPPRESS_LABEL_WARNING`: True

## 🔄 How to Activate

1. **Restart Claude Desktop** completely:
   - Quit Claude Desktop (Cmd+Q)
   - Reopen Claude Desktop

2. **Verify the server is loaded**:
   - Look for the MCP tools icon in Claude Desktop
   - You should see **32 OCI Logan tools** available

## 🧪 Testing the Server

Once Claude Desktop is restarted, try these test commands:

### Test 1: Check Connection
```
Use the check_oci_connection tool to verify OCI authentication
```

### Test 2: Get Namespace Info
```
Use get_namespace_info to see your OCI Logging Analytics workspace details
```

### Test 3: List Log Sources
```
Use list_log_sources to see available log sources in your compartment
```

### Test 4: Execute a Simple Query
```
Use execute_logan_query with:
- query: "* | head 10"
- timeRange: "24h"
- compartmentId: (use the one from env)
```

### Test 5: List Log Fields
```
Use list_log_fields to see all available fields in your logs
```

### Test 6: Get Storage Usage
```
Use get_storage_usage to see storage statistics for the last 30 days
```

## 📊 Available Tools (32 Total)

### Query Execution (4 tools)
- `execute_logan_query` - Execute OCI Log Analytics queries
- `search_security_events` - Natural language security event search
- `get_mitre_techniques` - MITRE ATT&CK technique analysis
- `analyze_ip_activity` - IP address behavioral analysis

### Advanced Analytics (5 tools)
- `execute_advanced_analytics` - Cluster, link, NLP, classify operations
- `execute_statistical_analysis` - Stats, timestats, eventstats
- `execute_field_operations` - Field extraction and transformation
- `search_log_patterns` - Pattern searching across logs
- `correlation_analysis` - Cross-log event correlation

### Resource Management (10 NEW tools)
- `list_log_sources` - List available log sources
- `get_log_source_details` - Get log source details
- `list_log_fields` - List available fields
- `get_field_details` - Get field statistics
- `get_namespace_info` - Get namespace information
- `list_entities` - List monitored entities
- `get_storage_usage` - Get storage statistics
- `list_parsers` - List log parsers
- `list_labels` - List available labels
- `query_recent_uploads` - Query recent uploads

### Dashboard Management (7 tools)
- `list_dashboards` - List dashboards (sample data)
- `get_dashboard` - Get dashboard details
- `get_dashboard_tiles` - Get dashboard tiles
- `create_dashboard` - Create dashboard (mock)
- `update_dashboard` - Update dashboard (mock)
- `export_dashboard` - Export dashboard JSON
- `import_dashboard` - Import dashboard JSON

### Saved Searches (2 tools)
- `create_saved_search` - Create saved search (mock)
- `list_saved_searches` - List saved searches (sample)

### Utility Tools (4 tools)
- `get_logan_queries` - Get predefined queries
- `validate_query` - Validate query syntax
- `get_documentation` - Get OCI query help
- `check_oci_connection` - Test OCI connection

## 🔍 Troubleshooting

### Server Not Appearing
- Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`
- Verify config JSON is valid: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq`
- Ensure dist/index.js exists: `ls -lh /Users/abirzu/dev/mcp-oci-logan-server/dist/index.js`

### OCI Authentication Errors
- Verify OCI CLI works: `oci iam region list`
- Check config file: `cat ~/.oci/config`
- Ensure compartment ID is correct

### Python Backend Errors
- Verify Python venv exists: `ls -d /Users/abirzu/dev/mcp-oci-logan-server/python/venv`
- Test Python client: `cd python && source venv/bin/activate && python logan_client.py --help`

### No Query Results
- Check compartment has log data
- Try broader time range (7d or 30d)
- Verify log sources are configured in OCI

## 📝 Configuration Backup

A backup of your previous Claude Desktop configuration was created at:
```
~/Library/Application Support/Claude/claude_desktop_config.json.backup-[timestamp]
```

## 🚀 Next Steps

1. Restart Claude Desktop
2. Look for the MCP tools in the UI
3. Try the test commands above
4. Explore the 32 available tools
5. Start analyzing your OCI logs!

## 📚 Documentation

- Full documentation: `/Users/abirzu/dev/mcp-oci-logan-server/README.md`
- User guide: `/Users/abirzu/dev/mcp-oci-logan-server/USER_GUIDE.md`
- Developer guide: `/Users/abirzu/dev/mcp-oci-logan-server/CLAUDE.md`

## 🎯 Quick Example Queries

### Security Analysis
```
Search for failed login attempts in the last 24 hours using search_security_events
```

### Resource Monitoring
```
List all monitored hosts using list_entities with entityType: "HOST"
```

### Storage Analysis
```
Get storage growth trends using get_storage_usage with timeRange: "30d"
```

---

**Server Status:** ✅ Ready to use
**Tools Available:** 32
**Authentication:** OCI Config File (~/.oci/config)
**Region:** EU Frankfurt (eu-frankfurt-1)
