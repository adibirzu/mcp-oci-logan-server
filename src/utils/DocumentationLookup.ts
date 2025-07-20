export class DocumentationLookup {
  private documentation: { [key: string]: string } = {};

  constructor() {
    this.initializeDocumentation();
  }

  private initializeDocumentation() {
    this.documentation = {
      'query_syntax': `
# OCI Logging Analytics Query Syntax

## Basic Structure
\`\`\`
[filters] | [operations] | [output formatting]
\`\`\`

## Key Points:
- Field names with spaces must be quoted: 'Event Name', 'User Name'
- Time field is capitalized: 'Time' not 'time'
- String values should be quoted: 'Event Name' = 'UserLogin'
- Use pipe (|) to chain operations

## Examples:
\`\`\`
'Event Name' = 'UserLogin' and Time > dateRelative(24h) | stats count by 'User Name'
'Log Source' = 'VCN Flow Logs' | head 100
* | search "error" | head 50
\`\`\`
      `,

      'field_names': `
# Common OCI Logging Analytics Field Names

## Identity and Access Management
- 'Event Name' - Type of event (UserLogin, UserLoginFailed, etc.)
- 'User Name' - Username performing the action
- 'Principal Name' - Full principal identifier
- 'IP Address' - Client IP address
- 'Source IP' - Source IP for network events
- 'Destination IP' - Destination IP for network events

## Resources and Infrastructure
- 'Resource Name' - Name of the OCI resource
- 'Compartment Name' - OCI compartment name
- 'Log Source' - Source of the log (VCN Flow Logs, Audit Logs, etc.)

## Security and MITRE ATT&CK
- 'Technique_id' - MITRE ATT&CK technique ID (T1003, T1110, etc.)
- 'Event_id' - Windows Event ID for Sysmon logs

## System Information
- 'Process Name' - Name of the process
- 'Command Line' - Command line used
- 'File Path' - File system path
- 'Registry Key' - Windows registry key

## Time
- 'Time' - Timestamp field (always capitalized)
      `,

      'functions': `
# OCI Logging Analytics Functions

## Statistical Functions
- **stats** - Aggregate data: \`stats count by 'User Name'\`
- **timestats** - Time-based aggregation: \`timestats count by Time span=1h\`
- **count** - Count records: \`stats count as total\`
- **sum** - Sum values: \`sum('Bytes') as total_bytes\`
- **avg** - Average values: \`avg('Duration') as avg_duration\`
- **min/max** - Minimum/maximum values

## Data Manipulation
- **search** - Text search: \`search "error"\`
- **where** - Filter results: \`where count > 10\`
- **sort** - Sort results: \`sort -count\` (descending), \`sort count\` (ascending)
- **head/tail** - Limit results: \`head 100\`, \`tail 50\`
- **distinct** - Unique values: \`distinct 'User Name'\`

## Time Functions
- **dateRelative()** - Relative time: \`dateRelative(24h)\`, \`dateRelative(7d)\`
- **span** - Time buckets in timestats: \`span=1h\`, \`span=1d\`

## String Functions
- **contains** - String contains: \`'Event Name' contains 'Login'\`
- **like** - Pattern matching: \`'User Name' like 'admin*'\`
- **matches** - Regex matching: \`'IP Address' matches '192\\.168\\..*'\`
      `,

      'time_filters': `
# Time Filtering in OCI Logging Analytics

## Basic Time Filter
\`\`\`
Time > dateRelative(24h)  # Last 24 hours
Time > dateRelative(7d)   # Last 7 days
Time > dateRelative(30d)  # Last 30 days
\`\`\`

## Time Units
- **m** - minutes: \`dateRelative(30m)\`
- **h** - hours: \`dateRelative(6h)\`
- **d** - days: \`dateRelative(7d)\`

## Important Notes
- Always use 'Time' (capitalized) not 'time'
- Time filters improve query performance significantly
- Use shorter time ranges for better performance

## Time Range Examples
\`\`\`
# Last hour
Time > dateRelative(1h)

# Between 2 days ago and 1 day ago
Time > dateRelative(2d) and Time < dateRelative(1d)

# Specific time window with timestats
Time > dateRelative(24h) | timestats count by Time span=1h
\`\`\`
      `,

      'operators': `
# OCI Logging Analytics Operators

## Comparison Operators
- **=** - Equals: \`'Event Name' = 'UserLogin'\`
- **!=** - Not equals: \`'Event Name' != 'UserLogout'\`
- **<, >, <=, >=** - Numeric comparison

## Text Operators
- **like** - Pattern matching with wildcards: \`'User Name' like 'admin*'\`
- **contains** - String contains: \`'Event Name' contains 'Login'\`
- **not contains** - String does not contain
- **matches** - Regex matching: \`'IP Address' matches '192\\.168\\..*'\`

## List Operators
- **in** - Value in list: \`'Event Name' in ('UserLogin', 'UserLogout')\`
- **not in** - Value not in list

## Null Operators
- **is null** - Field is empty: \`'User Name' is null\`
- **is not null** - Field has value: \`'Technique_id' is not null\`

## Logical Operators
- **and** - Logical AND: \`'Event Name' = 'UserLogin' and Time > dateRelative(24h)\`
- **or** - Logical OR: \`'Event Name' = 'UserLogin' or 'Event Name' = 'UserLogout'\`
- **not** - Logical NOT: \`not 'User Name' = 'system'\`
      `,

      'mitre_mapping': `
# MITRE ATT&CK Integration

## Technique ID Field
Use the 'Technique_id' field to filter by MITRE ATT&CK techniques:
\`\`\`
'Technique_id' = 'T1003'        # Specific technique
'Technique_id' like 'T1003*'    # Technique family
'Technique_id' is not null      # Any MITRE technique
\`\`\`

## Common MITRE Categories

### Credential Access (T1003-T1606)
\`\`\`
'Technique_id' like 'T1003*' or 'Technique_id' like 'T1110*' or 'Technique_id' like 'T1555*'
\`\`\`

### Privilege Escalation (T1055-T1548)
\`\`\`
'Technique_id' like 'T1055*' or 'Technique_id' like 'T1068*' or 'Technique_id' like 'T1134*'
\`\`\`

### Defense Evasion (T1027-T1620)
\`\`\`
'Technique_id' like 'T1027*' or 'Technique_id' like 'T1036*' or 'Technique_id' like 'T1070*'
\`\`\`

## Example Queries
\`\`\`
# All MITRE techniques in last 7 days
'Technique_id' is not null and Time > dateRelative(7d) | stats count by 'Technique_id' | sort -count

# Credential access techniques
'Technique_id' like 'T1003*' and Time > dateRelative(24h) | stats count by 'Technique_id', 'User Name'
\`\`\`
      `,

      'examples': `
# Common Query Examples

## Security Monitoring

### Failed Login Attempts
\`\`\`
'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) 
| stats count by 'User Name', 'IP Address' 
| sort -count
\`\`\`

### Privilege Escalation Events
\`\`\`
'Event Name' contains 'RoleAssign' or 'Event Name' contains 'PrivilegeUse' 
and Time > dateRelative(24h) 
| stats count by 'User Name', 'Event Name'
\`\`\`

### Administrator Activity
\`\`\`
'User Name' contains 'admin' and Time > dateRelative(24h) 
| stats count by 'Event Name', 'User Name', 'IP Address'
\`\`\`

## Network Analysis

### VCN Flow Logs Analysis
\`\`\`
'Log Source' = 'VCN Flow Logs' and 'Action' = 'ACCEPT' 
and Time > dateRelative(24h) 
| stats count by 'Source IP', 'Destination IP' 
| sort -count
\`\`\`

### High Volume Connections
\`\`\`
'Log Source' = 'VCN Flow Logs' and Time > dateRelative(1h) 
| timestats count by 'Source IP' span=5m 
| where count > 1000
\`\`\`

## Resource Monitoring

### Resource Deletions
\`\`\`
'Event Name' contains 'Delete' and Time > dateRelative(24h) 
| stats count by 'Event Name', 'User Name', 'Resource Name' 
| sort -count
\`\`\`

### Compartment Activity
\`\`\`
'Compartment Name' = 'Production' and Time > dateRelative(24h) 
| stats count by 'Event Name', 'User Name' 
| sort -count
\`\`\`

## MITRE ATT&CK Hunting

### All Techniques
\`\`\`
'Log Source' = 'Windows Sysmon Events' and 'Technique_id' is not null 
and Time > dateRelative(7d) 
| timestats count as events by 'Technique_id' 
| sort -events
\`\`\`

### Credential Access
\`\`\`
'Technique_id' like 'T1003*' or 'Technique_id' like 'T1110*' 
and Time > dateRelative(24h) 
| stats count by 'Technique_id', 'User Name'
\`\`\`
      `,

      'troubleshooting': `
# Query Troubleshooting Guide

## Common Errors and Solutions

### "Missing input" Error
**Cause:** Incorrect field names or syntax
**Solutions:**
- Check field name capitalization: use 'Time' not 'time'
- Quote field names with spaces: 'Event Name' not Event Name
- Verify operator syntax: use 'contains' not 'CONTAINS'

### "Invalid time filter" Error
**Cause:** Incorrect time filter format
**Solutions:**
- Use 'Time' (capitalized): \`Time > dateRelative(24h)\`
- Check time unit format: \`24h\`, \`7d\`, \`30m\`
- Ensure proper syntax: \`dateRelative(24h)\` not \`dateRelative('24h')\`

### Query Too Slow
**Causes and Solutions:**
- **Add time filter:** Always include \`Time > dateRelative(24h)\`
- **Use specific filters:** Avoid starting with \`*\` without filters
- **Add limits:** Use \`| head 100\` to limit results
- **Index fields:** Use indexed fields like 'Event Name', 'User Name'

### No Results Returned
**Check:**
- Time range is appropriate for your data
- Field names are spelled correctly
- Values exist in the specified time period
- Log sources are collecting data

## Query Optimization Tips

### Performance Best Practices
1. **Always use time filters**
2. **Filter early in the query**
3. **Use specific field values when possible**
4. **Limit result sets with head/tail**
5. **Use indexed fields for filtering**

### Example Optimization
**Before (slow):**
\`\`\`
* | search "error" | stats count by 'User Name'
\`\`\`

**After (fast):**
\`\`\`
'Event Name' contains 'Error' and Time > dateRelative(24h) 
| stats count by 'User Name' 
| head 100
\`\`\`
      `
    };
  }

  async getDocumentation(topic?: string, searchTerm?: string): Promise<string> {
    if (topic && this.documentation[topic]) {
      return this.documentation[topic];
    }

    if (searchTerm) {
      const results: string[] = [];
      const lowerSearchTerm = searchTerm.toLowerCase();

      Object.entries(this.documentation).forEach(([key, content]) => {
        if (content.toLowerCase().includes(lowerSearchTerm)) {
          results.push(`## ${key.replace('_', ' ').toUpperCase()}\\n${content}\\n`);
        }
      });

      if (results.length > 0) {
        return `# Search Results for "${searchTerm}"\\n\\n${results.join('\\n---\\n\\n')}`;
      } else {
        return `No documentation found for "${searchTerm}". Available topics: ${Object.keys(this.documentation).join(', ')}`;
      }
    }

    // Return overview of all available topics
    return `
# OCI Logging Analytics Documentation

## Available Topics:
${Object.keys(this.documentation).map(topic => `- **${topic}**: ${this.getTopicDescription(topic)}`).join('\\n')}

## Quick Start
1. Always include time filters: \`Time > dateRelative(24h)\`
2. Quote field names with spaces: \`'Event Name'\`
3. Use appropriate operators: \`contains\`, \`like\`, \`=\`
4. Limit results for performance: \`| head 100\`

## Example Query
\`\`\`
'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) 
| stats count by 'User Name', 'IP Address' 
| sort -count 
| head 100
\`\`\`

Use the specific topic commands to get detailed documentation on each area.
    `;
  }

  private getTopicDescription(topic: string): string {
    const descriptions: { [key: string]: string } = {
      'query_syntax': 'Basic query structure and syntax rules',
      'field_names': 'Common field names used in OCI Logging Analytics',
      'functions': 'Available functions for data manipulation and analysis',
      'time_filters': 'How to use time filters effectively',
      'operators': 'Comparison, text, and logical operators',
      'mitre_mapping': 'MITRE ATT&CK technique integration',
      'examples': 'Common query patterns and examples',
      'troubleshooting': 'Common issues and performance optimization'
    };

    return descriptions[topic] || 'Documentation topic';
  }

  getQuickReference(): string {
    return `
# Quick Reference

## Essential Syntax
- Field names: \`'Event Name'\`, \`'User Name'\`, \`'Time'\`
- Time filter: \`Time > dateRelative(24h)\`
- Text search: \`'Event Name' contains 'Login'\`
- Stats: \`stats count by 'User Name'\`
- Sorting: \`sort -count\` (desc), \`sort count\` (asc)
- Limit: \`head 100\`

## Common Patterns
\`\`\`
# Security events
'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'

# Network analysis  
'Log Source' = 'VCN Flow Logs' and Time > dateRelative(1h) | stats count by 'Source IP'

# MITRE techniques
'Technique_id' is not null and Time > dateRelative(7d) | stats count by 'Technique_id'
\`\`\`
    `;
  }
}