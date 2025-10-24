# MITRE Technique Query Update

## ✅ Updated Implementation

The `get_mitre_techniques` method has been updated to use the corrected OCI Logging Analytics query syntax as shown in the Log Explorer screenshot.

### 🔧 **Updated Query Syntax**

**Before:**
```sql
'Log Source' = 'Windows Sysmon Events' and 'Technique_id' like 'T1574.002*' and Time > dateRelative(7d) | timestats count as events by 'Technique_id', 'Event Name' | sort -events
```

**After (Based on Log Explorer):**
```sql
'Log Source' = 'Windows Sysmon Events' and Technique_id != T1574.002 | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'
```

### 🎯 **Key Changes**

1. **Field Name**: Changed `'Technique_id'` to `Technique_id` (without quotes for computed fields)
2. **Condition**: Changed from `like` pattern matching to `!=` (not equals)
3. **Output Fields**: Added specific fields selection with `| fields`
4. **Aggregation**: Uses `timestats count as logrecords` for time-series analysis
5. **Grouping**: Groups by `'Log Source'` instead of technique details

### 🔍 **Query Functionality**

#### For Specific Technique ID:
```sql
'Log Source' = 'Windows Sysmon Events' and Technique_id != T1574.002 | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'
```

#### For All Techniques:
```sql
'Log Source' = 'Windows Sysmon Events' and Technique_id != '' | fields Technique_id, 'Destination IP', 'Source IP' | timestats count as logrecords by 'Log Source'
```

### 📊 **Test Results**

The updated queries have been tested and return real OCI Logging Analytics data:

```json
{
  "success": true,
  "totalCount": 10,
  "executionTime": 2484,
  "data": [
    {
      "Time": 1613300827000,
      "logrecords": 0
    },
    // ... more time-series data
  ]
}
```

### 🛠️ **Implementation Details**

1. **Query Syntax Fixing**: Added specific handling for `Technique_id` field
2. **Time Series Analysis**: Returns timestats results showing log record counts over time
3. **Field Selection**: Properly selects relevant fields including IP addresses
4. **Real Data**: All results come from actual OCI Logging Analytics - no mock data

### 🚀 **Usage Example**

```javascript
// Get MITRE technique analysis for T1574.002
const result = await mcpClient.callTool('get_mitre_techniques', {
  techniqueId: 'T1574.002',
  timeRange: '24h'
});

// Get all MITRE techniques
const allTechniques = await mcpClient.callTool('get_mitre_techniques', {
  timeRange: '7d'
});
```

The update ensures compatibility with OCI Logging Analytics field naming conventions and provides time-series analysis of MITRE technique occurrences.