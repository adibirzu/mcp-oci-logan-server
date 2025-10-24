# MCP Server Improvements & User Guidance

## Summary of Improvements

This document explains the improvements made to the OCI Logan MCP server and what users need to know to get better responses from the MCP.

### 🚨 CRITICAL UPDATE (Latest Fix)

**The `list_active_log_sources` tool was returning incomplete results!**

- **Problem**: Only returning 1-2 sources when console showed 12+ sources
- **Fixed**: Now returns ALL active sources matching the OCI Console exactly
- **Impact**: Resource discovery questions now work correctly

This was the most important fix - users asking "What log sources are available?" will now get complete, accurate answers.

## 🔧 Technical Fixes

### 1. 🚨 CRITICAL FIX: list_active_log_sources Now Returns Complete Results

**Problem:** The `list_active_log_sources` tool was only returning 1-2 active sources when the OCI Console showed 12+ sources with data.

**Root Cause:** The Python backend was using `execute_query()` which adds the time filter directly to the query string:
```sql
* and Time > dateRelative(1h) | stats count by 'Log Source'
```
This query pattern only returned 1 source due to how OCI Logging Analytics processes the combined filter+stats operation.

**Solution:** Changed to use `execute_query_like_console()` which sends the time filter as a separate `timeFilter` parameter (exactly like the OCI Console does), not embedded in the query string. This now returns ALL active sources.

**Result:**
- Before: 1 source returned (incomplete)
- After: 12 sources returned (complete, matching console)
- Query: `* | stats count by 'Log Source' | sort -count` (time filter sent separately)

**Impact:** Users will now see complete, accurate results when asking:
```
"What log sources are available?"
"Show me top 10 log sources with logs"
"List all active log sources"
```

**File Changed:** `python/logan_client.py:571-578`

### 2. Fixed Hardcoded Path Issue

**Problem:** The `QueryTransformer.ts` file had a hardcoded path to the Logan Security Dashboard project (`/Users/abirzu/dev/logan-security-dashboard`) that wouldn't work on other systems.

**Solution:**
- Added environment variable support: `LOGAN_PROJECT_PATH`
- Made the code check if the path exists before attempting to load
- Gracefully falls back to default queries if Logan project not found
- Users can now optionally set `LOGAN_PROJECT_PATH` if they have the Logan Security Dashboard project

**File Changed:** `src/utils/QueryTransformer.ts:27-51`

### 2. Updated Claude Desktop Configuration Template

**Problem:** The configuration template was missing important environment variables and didn't provide clear guidance.

**Solution:**
- Added `OCI_REGION` environment variable to the template
- Changed placeholder text to be more explicit about absolute paths
- Added `LOGAN_DEBUG` option for troubleshooting
- Made the template more user-friendly with better placeholders

**File Changed:** `claude_desktop_config.json.template`

**New template:**
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..aaaaaaaa[YOUR-COMPARTMENT-ID]",
        "OCI_REGION": "us-ashburn-1",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
```

### 3. Corrected Documentation

**Problem:** Documentation incorrectly stated there were 19 tools when the server actually implements 33 tools.

**Solution:**
- Updated README.md to reflect correct tool count: **33 tools**
- Documented all 10 resource management tools that were missing from documentation
- Clarified which tools are fully functional vs. partially implemented

**Files Changed:** `README.md` (multiple sections)

## 📚 New User Guide

**Created:** `USER_GUIDE.md` - A comprehensive guide on how to ask questions effectively

This guide includes:
- ✅ **DO's and DON'Ts** for asking questions
- 🔍 **Types of questions** the MCP handles well
- 📊 **Example conversation flows** showing how to interact with Claude
- 🛠️ **Complete tool reference** with all 33 tools documented
- 🔧 **Troubleshooting guide** for common issues
- 🚀 **Advanced usage patterns** for power users
- ⚙️ **Configuration tips** for optimal setup

## 📊 Tool Inventory (Corrected)

The MCP server provides **33 specialized tools** (not 19 as previously documented):

### Core Query Tools (4 tools) ✅ Fully Functional
1. `execute_logan_query` - Direct OCI query execution
2. `search_security_events` - Natural language security search
3. `get_mitre_techniques` - MITRE ATT&CK analysis
4. `analyze_ip_activity` - IP behavioral analysis

### Advanced Analytics (5 tools) ✅ Fully Functional
5. `execute_advanced_analytics` - ML-powered analytics
6. `execute_statistical_analysis` - Statistical operations
7. `execute_field_operations` - Field extraction
8. `search_log_patterns` - Pattern detection
9. `correlation_analysis` - Cross-log correlation

### Resource Management (10 tools) ✅ Fully Functional *(Newly Documented)*
10. `list_log_sources` - Available log sources
11. `get_log_source_details` - Source details
12. `list_active_log_sources` - Active sources only
13. `list_log_fields` - Available query fields
14. `get_field_details` - Field metadata
15. `get_namespace_info` - Namespace information
16. `list_entities` - Entities (hosts, databases, etc.)
17. `get_storage_usage` - Storage statistics
18. `list_parsers` - Available log parsers
19. `list_labels` - Categorization labels
20. `query_recent_uploads` - Recent log uploads

### Dashboard Tools (7 tools) ⚠️ Partially Implemented
21. `list_dashboards` - List dashboards (returns sample data)
22. `get_dashboard` - Get dashboard details (basic)
23. `get_dashboard_tiles` - Get dashboard tiles (partial)
24. `create_dashboard` - Create dashboard (mock)
25. `update_dashboard` - Update dashboard (mock)
26. `export_dashboard` - Export dashboard JSON
27. `import_dashboard` - Import dashboard JSON

### Utility Tools (4 tools) ✅ Fully Functional
28. `get_logan_queries` - Predefined query templates
29. `validate_query` - Query syntax validation
30. `get_documentation` - Built-in help system
31. `check_oci_connection` - Authentication testing

### Saved Search Tools (3 tools) ⚠️ Mixed Implementation
32. `create_saved_search` - Create saved search (mock)
33. `list_saved_searches` - List saved searches (mock)

## 🎯 What Users Need to Do for Better Responses

### 1. Update Your Configuration

**Action Required:** Update your Claude Desktop configuration file with the new template:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Add these environment variables:**
```json
"OCI_REGION": "us-ashburn-1",
"LOGAN_DEBUG": "false"
```

**Why:**
- `OCI_REGION` ensures queries go to the correct OCI region
- `LOGAN_DEBUG` can be enabled for troubleshooting

### 2. Ask Natural Language Questions

**The MCP is designed for conversation, not commands.**

**✅ Good Examples:**
```
"Show me failed login attempts in the last 24 hours"
"What log sources are available in my environment?"
"Find all MITRE ATT&CK techniques from the last 30 days"
"Analyze activity for IP address 192.168.1.100"
"List all available fields I can query"
```

**❌ Avoid:**
- Don't try to write OCI query syntax unless you're experienced
- Don't expect dashboard creation/updates to work (known limitation)
- Don't ask about non-OCI data sources

### 3. Use Resource Discovery First

**Before diving into queries, discover what's available:**

```
"What log sources are in my environment?"
"Show me all available fields"
"List entities of type 'host'"
"What parsers are configured?"
"Show me recent log uploads"
```

**Why:** This helps you understand what data is available and prevents "no results" frustration.

### 4. Specify Time Ranges Appropriately

**Different data types need different time ranges:**

- **Recent events:** Use 1h, 6h, 24h
- **Security investigations:** Use 7d (7 days)
- **MITRE ATT&CK/Sysmon data:** Use **30d minimum** (30 days)

**Example:**
```
"Show me MITRE techniques in the last 30 days"  ✅ Good
"Show me MITRE techniques in the last 1 hour"   ❌ Too narrow
```

### 5. Leverage Built-in Help

**The MCP has extensive documentation built in:**

```
"Show me documentation for query syntax"
"Get help with MITRE technique mapping"
"Show me examples of field operations"
"List available predefined security queries"
```

### 6. Chain Questions for Investigation

**Build on previous answers:**

```
User: "What log sources are available?"
Claude: [Lists log sources including Windows Sysmon Events]

User: "Show me failed logins from Sysmon in the last 24 hours"
Claude: [Executes query and shows 47 failed logins]

User: "Analyze the top IP from those results"
Claude: [Performs IP activity analysis]
```

### 7. Understand Limitations

**Dashboard tools are limited:**
- `list_dashboards` returns sample data (not real dashboards)
- `create_dashboard` and `update_dashboard` are mock implementations
- This is a known limitation documented in the README

**What works fully:**
- All core query tools ✅
- All advanced analytics tools ✅
- All resource management tools ✅
- All utility tools ✅

## 🔍 Troubleshooting Common Issues

### Issue: "No results returned"

**Solutions:**
1. Check time range (use 30d for MITRE data)
2. Verify compartment ID in config
3. Ask: `"What log sources are actively sending data?"`
4. Ask: `"Show me recent log uploads"`

### Issue: "Query syntax error"

**Solutions:**
1. Use natural language instead of writing queries
2. Ask: `"Validate this query: [your query]"`
3. Ask: `"Show me documentation for query syntax"`

### Issue: "Authentication failed"

**Solutions:**
1. Test OCI CLI: `oci iam region list`
2. Check `~/.oci/config` file exists
3. Ask Claude: `"Check my OCI connection"`

### Issue: "Dashboard tools not working"

**Expected behavior:** Dashboard management tools are partially implemented. Use resource management tools instead for discovering what's in your environment.

## 📖 Additional Resources

### Read the User Guide

**File:** `USER_GUIDE.md`

Comprehensive guide covering:
- How to ask effective questions
- Complete tool reference
- Example conversation flows
- Advanced usage patterns
- Configuration tips
- Troubleshooting guide

### Enable Debug Mode

For detailed troubleshooting:

1. Update Claude Desktop config:
   ```json
   "LOGAN_DEBUG": "true"
   ```

2. Restart Claude Desktop

3. Check logs:
   - Mac: `~/Library/Logs/Claude/`
   - Look for MCP server output

### Test Your Setup

Before using the MCP with Claude, test it:

```bash
cd /path/to/mcp-oci-logan-server
npm run build
node test-server.js
```

## 🚀 Getting Started (Updated Workflow)

### 1. Update Configuration

```bash
cd ~/Library/Application\ Support/Claude/
cp ~/path/to/mcp-oci-logan-server/claude_desktop_config.json.template .
# Edit the file with your compartment ID and region
```

### 2. Rebuild the MCP Server

```bash
cd /path/to/mcp-oci-logan-server
npm run build
```

### 3. Restart Claude Desktop

Quit and restart Claude Desktop to load the updated configuration.

### 4. Test Connection

In Claude Desktop, ask:
```
"Check my OCI connection and show me namespace information"
```

### 5. Discover Resources

```
"What log sources are available in my environment?"
"Show me all available fields for querying"
"List entities in my compartment"
```

### 6. Start Investigating

```
"Show me failed login attempts in the last 24 hours"
"Find MITRE techniques in the last 30 days"
"Analyze activity for IP [your IP]"
```

## 📝 Summary of Changes for Users

| What Changed | Impact | Action Required |
|--------------|--------|-----------------|
| Fixed hardcoded path | No impact (graceful fallback) | None |
| Updated config template | Better defaults | Update Claude Desktop config |
| Corrected tool count | Better understanding | Read USER_GUIDE.md |
| Created USER_GUIDE.md | Better user experience | Read the guide |
| Documented resource tools | Discover what's available | Use discovery questions |

## 🎓 Key Takeaways

1. **33 tools available** (not 19) - 10 resource management tools were undocumented
2. **Use natural language** - Don't worry about OCI query syntax
3. **Discover first** - Ask what's available before querying
4. **Appropriate time ranges** - 30d minimum for MITRE data
5. **Dashboard tools limited** - Known limitation, use resource tools instead
6. **Read USER_GUIDE.md** - Comprehensive guide for effective usage
7. **Update config** - Add OCI_REGION and LOGAN_DEBUG to your config

## 📞 Getting Help

If you encounter issues:

1. **Read USER_GUIDE.md** - Most questions answered there
2. **Enable debug mode** - Set `LOGAN_DEBUG: "true"`
3. **Check OCI CLI** - Run `oci iam region list` to verify auth
4. **Test connection** - Ask Claude: `"Check my OCI connection"`
5. **Ask for help** - Use natural language to describe the issue

---

**Remember:** The MCP server is designed to be conversational. Ask questions naturally, and Claude will use the appropriate tools automatically. You don't need to memorize tool names or commands!
