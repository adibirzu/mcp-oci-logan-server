# Release Notes - v1.3.0

## 🚨 Critical Fix Release

**Release Date**: October 2025
**Priority**: CRITICAL UPDATE - All users should upgrade

---

## Summary

Version 1.3.0 addresses a **critical bug** where the `list_active_log_sources` tool was returning incomplete results (showing only 1-2 sources when 12+ sources had data). This release also includes important path fixes and comprehensive documentation improvements.

## 🔥 Critical Fix

### Resource Discovery Now Returns Complete Results

**Issue**: The `list_active_log_sources` tool was only returning 1-2 active sources when the OCI Console showed 12+ sources with data.

**Impact**: Users asking "What log sources are available?" received incomplete, inaccurate information, making it impossible to discover all available data sources.

**Root Cause**: The Python backend was using `execute_query()` which embeds the time filter in the query string:
```sql
* and Time > dateRelative(1h) | stats count by 'Log Source'
```
This query pattern caused OCI Logging Analytics to return incomplete results (only 1 source).

**Solution**: Changed to use `execute_query_like_console()` which sends the time filter as a separate `timeFilter` parameter (exactly how the OCI Console does it):
```python
# Query sent to OCI
query: "* | stats count by 'Log Source' | sort -count"
timeFilter: { timeStart: "...", timeEnd: "...", timeZone: "UTC" }
```

**Result**: Now returns **ALL 12+ active sources** with accurate log counts, matching the OCI Console exactly.

**File Changed**: `python/logan_client.py` lines 571-578

### Before vs After

**Before v1.3.0** (Incomplete Results):
```
User: "What log sources are available?"
Claude: "You have 2 active log sources:
  - OCI Audit Logs: 2,074,222 logs
  - OCI Events Logs: 1,544 logs"
```
❌ **WRONG - Missing 10+ other sources!**

**After v1.3.0** (Complete Results):
```
User: "What log sources are available?"
Claude: "You have 12 active log sources:
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
```
✅ **CORRECT - All 12 sources shown!**

---

## 🔧 Additional Fixes

### 1. Fixed Hardcoded Path Issue

**Problem**: `QueryTransformer.ts` had a hardcoded path to the Logan Security Dashboard project that wouldn't work on other systems.

**Solution**:
- Added environment variable support: `LOGAN_PROJECT_PATH`
- Made the code check if the path exists before attempting to load
- Gracefully falls back to default queries if the path doesn't exist

**Impact**: The MCP server now works on any system without manual path configuration.

**File Changed**: `src/utils/QueryTransformer.ts` lines 27-51

### 2. Updated Claude Desktop Configuration Template

**Changes**:
- Added `OCI_REGION` environment variable (recommended)
- Added `LOGAN_DEBUG` for troubleshooting support
- Made placeholders more explicit and user-friendly
- Better example showing absolute path requirement

**File Changed**: `claude_desktop_config.json.template`

**New template**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..aaaaaaaa[YOUR-ID]",
        "OCI_REGION": "us-ashburn-1",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
```

---

## 📚 Documentation Improvements

### New Documentation Files

1. **USER_GUIDE.md** (New)
   - Comprehensive guide on asking effective questions
   - Complete tool reference (all 33 tools)
   - Example conversation flows with expected results
   - Advanced usage patterns
   - Troubleshooting guide
   - Quick reference card

2. **IMPROVEMENTS.md** (New)
   - Detailed explanation of all fixes
   - What users need to do differently
   - Complete tool inventory
   - Troubleshooting common issues

3. **CRITICAL_FIX_README.md** (New)
   - Focused explanation of the critical fix
   - Before/after examples
   - Technical details
   - Upgrade instructions

4. **RELEASE_NOTES_v1.3.0.md** (This file)
   - Complete changelog
   - Upgrade guide
   - Testing instructions

### Updated Documentation

1. **README.md**
   - Added v1.3.0 update notice at top
   - Updated "Recent Updates" section
   - Corrected tool count (33 tools, not 19)
   - Updated Implementation Reality Check
   - Marked completed priorities as done
   - Updated version to 1.3.0

2. **USER_GUIDE.md**
   - Added v1.3.0 update notice
   - Updated example conversation flows with complete results
   - Added troubleshooting for incomplete results
   - Added version verification instructions
   - Added quick reference card

---

## 📊 Complete Tool Inventory

The MCP server provides **33 specialized tools** (corrected from previously documented 19):

| Category | Count | Status |
|----------|-------|--------|
| Core Query Tools | 4 | ✅ Fully functional |
| Advanced Analytics | 5 | ✅ Fully functional |
| **Resource Management** | **10** | ✅ **Fully functional (FIXED)** |
| Dashboard Tools | 7 | ⚠️ Partial/Mock |
| Utility Tools | 4 | ✅ Fully functional |
| Saved Search Tools | 3 | ⚠️ Mixed |

**Key**: The 10 resource management tools were fully functional but undocumented. The critical fix ensures they now return complete results.

---

## 🚀 Upgrade Instructions

### For Git Users

```bash
cd /path/to/mcp-oci-logan-server
git pull
npm run build
# Restart Claude Desktop
```

### For Local Copy Users

```bash
cd /path/to/mcp-oci-logan-server
npm run build
# Restart Claude Desktop
```

### Update Claude Desktop Configuration (Recommended)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

Add these environment variables if missing:
```json
"OCI_REGION": "us-ashburn-1",
"LOGAN_DEBUG": "false"
```

---

## ✅ Testing the Update

After upgrading to v1.3.0:

### 1. Verify Installation

```bash
cd /path/to/mcp-oci-logan-server
grep "Version" README.md | head -1
```
Should show: `**Version**: 1.3.0`

### 2. Test the Critical Fix

Restart Claude Desktop and ask:
```
"What log sources are available in my environment?"
```

**Expected Results**:
- Shows 12+ active sources (your actual number may vary)
- Each source shows individual log count
- Matches your OCI Console Log Explorer exactly
- Total log count displayed

**If you see only 1-2 sources**:
- You're still on an old version
- Run `npm run build` again
- Restart Claude Desktop
- Clear Claude Desktop cache if necessary

### 3. Test Other Features

```
"Show me all available fields for querying"
"List entities in my environment"
"What parsers are configured?"
"Check my OCI connection"
```

All commands should work and return complete results.

---

## 💡 What This Means for Users

### Questions That Now Work Properly

These questions now return **complete, accurate results**:

✅ **Resource Discovery**:
- "What log sources are available?"
- "Show me top 10 log sources with logs"
- "List all active log sources"
- "Which log sources have data?"

✅ **All Other Tools**:
- All other 23 fully functional tools continue to work as before
- No breaking changes to existing functionality

### Questions Still Limited

⚠️ **Dashboard Management** (Known Limitation):
- "Create a new dashboard" - Mock implementation
- "Update dashboard" - Mock implementation
- "List dashboards" - Returns sample data

Use resource management tools instead for discovering what's in your environment.

---

## 🐛 Known Issues & Limitations

### Dashboard Management Tools (Unchanged)

Dashboard creation, updating, and listing tools remain partially implemented with mock data. This is a known limitation documented in the README.

**Workaround**: Use resource management tools:
- `list_log_sources` - See all configured sources
- `list_log_fields` - See available fields
- `list_entities` - See entities in environment

### No Breaking Changes

This release includes **no breaking changes**. All existing queries and tools continue to work as before. The only change is that resource discovery now returns complete results instead of incomplete results.

---

## 📖 Additional Documentation

For complete information, see:

- **USER_GUIDE.md** - How to ask questions effectively
- **IMPROVEMENTS.md** - Detailed explanation of all changes
- **CRITICAL_FIX_README.md** - Focused on the critical fix
- **README.md** - Complete project documentation

---

## 🎓 Key Takeaways

1. **Critical fix applied**: Resource discovery now returns complete results
2. **33 tools available**: 10 resource management tools were previously undocumented
3. **Console-accurate**: Results now match OCI Console exactly
4. **No breaking changes**: All existing functionality preserved
5. **Better documentation**: Comprehensive guides created
6. **Path issues fixed**: No more hardcoded paths
7. **Easy to verify**: Simple test to confirm upgrade worked

---

## 📞 Support & Feedback

If you encounter issues:

1. **Check version**: Verify you're running v1.3.0
2. **Read USER_GUIDE.md**: Most questions answered there
3. **Enable debug mode**: Set `LOGAN_DEBUG: "true"` in config
4. **Test basics**: Ask "What log sources are available?"
5. **Review logs**: Check Claude Desktop logs for errors

---

## 🙏 Credits

This release was developed with assistance from:
- Oracle Code Assist
- Claude (Anthropic)
- User feedback identifying the incomplete results issue

---

**Version**: 1.3.0
**Release Date**: October 2025
**Priority**: CRITICAL UPDATE
**Status**: STABLE

**All users should upgrade immediately to get complete, accurate results from resource discovery queries.**
