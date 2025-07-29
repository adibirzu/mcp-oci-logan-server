# MCP OCI Logan Server

## ⚠️ Disclaimer

This software was created to showcase Oracle Cloud Infrastructure (OCI) Logging Analytics capabilities and demonstrate how to expand them using third-party services and AI tools. The architecture and code were written by me with the assistance of Oracle Code Assist and multiple LLMs including Claude, OpenAI GPT-4o, Meta Llama 3.2, and Grok 3. This is an educational project designed to learn more about OCI's service capabilities and how to optimize security monitoring tasks through AI integration.

**This is NOT an official Oracle product** - it is a personal project demonstrating integration possibilities with OCI Logging Analytics and AI assistants.

---

A Model Context Protocol (MCP) server that connects Claude to Oracle Cloud Infrastructure (OCI) Logging Analytics, enabling natural language querying and analysis of security logs from the Logan Security Dashboard.

## Features

### 🔍 Query Execution
- **Execute Logan Queries**: Run predefined Logan Security Dashboard queries against OCI Logging Analytics
- **Natural Language Search**: Convert natural language to OCI query syntax
- **MITRE ATT&CK Integration**: Search for specific MITRE techniques and tactics (default 30d for Sysmon data)
- **IP Activity Analysis**: Comprehensive analysis of IP address behavior with multiple analysis types
- **Time Correlation**: Synchronized time periods across all logs for proper correlation

### 🛡️ Security Analysis
- **Security Event Search**: Find authentication failures, privilege escalations, network anomalies
- **Threat Intelligence**: Analyze suspicious activities and threat patterns
- **RITA Integration**: Network behavior analysis capabilities
- **Real-time Monitoring**: Query live security events and logs with accurate time ranges
- **Cross-Log Correlation**: Consistent time filtering for correlating events across different log sources

### 📊 Dashboard Management
- **List Dashboards**: Browse available OCI dashboards in your tenant
- **Dashboard Details**: Get complete dashboard configurations and widget information
- **Create Dashboards**: Build new dashboards with custom queries and visualizations
- **Update Dashboards**: Modify existing dashboards, add/remove widgets
- **Export/Import**: JSON-based dashboard portability
- **Saved Searches**: Create and manage reusable query templates

### 🔧 Developer Tools
- **Query Validation**: Syntax validation with automatic error fixing
- **Documentation Lookup**: Built-in help system for OCI query syntax
- **Connection Testing**: Verify OCI authentication and connectivity
- **Error Handling**: Comprehensive error reporting and troubleshooting
- **Debug Logging**: Extensive debugging capabilities for troubleshooting

### 🏢 Enterprise Features
- **Multi-tenant Support**: Query across multiple OCI environments
- **Authentication Methods**: Support for config files, instance principals, and resource principals
- **Performance Optimization**: Intelligent query optimization and syntax fixing
- **Compartment Management**: Support for multiple compartments with proper access control

## Prerequisites

1. **OCI Account**: Access to Oracle Cloud Infrastructure
2. **OCI CLI**: Configured with appropriate credentials
3. **Logan Security Dashboard**: Working installation (optional, for predefined queries)
4. **Claude Desktop**: For MCP integration

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server
npm install
npm run build
```

### 2. OCI Configuration

**Option A: OCI CLI Configuration**
```bash
oci setup config
```

**Option B: Environment Variables**
```bash
export OCI_USER_ID="ocid1.user.oc1..xxx"
export OCI_FINGERPRINT="xx:xx:xx..."
export OCI_TENANCY_ID="ocid1.tenancy.oc1..xxx"
export OCI_REGION="us-ashburn-1"
export OCI_KEY_FILE="/path/to/private/key.pem"
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..xxx"
```

**Option C: Instance Principal (for OCI Compute)**
No configuration needed - automatically detected when running on OCI.

### 3. Python Environment Setup

```bash
# Setup Python virtual environment for query execution
./setup-python.sh
```

### 4. Claude Desktop Configuration

Copy the template and customize:
```bash
cp claude_desktop_config.json.template claude_desktop_config.json
```

Edit `claude_desktop_config.json` with your paths:

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/Users/abirzu/dev/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
        "OCI_REGION": "eu-frankfurt-1"
      }
    }
  }
}
```

Then add to `~/Library/Application Support/Claude/claude_desktop_config.json`.

### 5. Test Installation

```bash
# Test server functionality
node test-server.js

# Test OCI direct connection
node test-oci-direct.js

# Test time correlation
node test-time-correlation.js

# Test dashboard export
node test-dashboard-export.js
```

## Usage Examples

### Basic Query Execution

```
Execute this Logan query with your compartment ID:
'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'
```

### Natural Language Security Search

```
Search for failed login attempts in the last 24 hours
```

### MITRE ATT&CK Analysis

```
Find all credential access techniques in the last 30 days (default for Sysmon data)
```

### IP Investigation

```
Analyze all activity for IP address 192.168.1.100 in the last 24 hours
```

### Dashboard Management

```
List all active dashboards in your compartment

Get dashboard details for ocid1.dashboard.oc1..example123

Export dashboard ocid1.dashboard.oc1..example123 as JSON
```

### Saved Search Management

```
Create a saved search named "Failed Logins" with query: 'Event Name' = 'UserLoginFailed' | stats count by 'User Name'

List all saved searches in my compartment
```

### Documentation Lookup

```
Show me the documentation for OCI query syntax

Get help with MITRE technique mapping
```

## Available Tools

### Core Query Tools

#### `execute_logan_query`
Execute OCI Logging Analytics queries with validation and error handling.

**Parameters:**
- `query` (required): OCI Logging Analytics query
- `queryName` (optional): Name/identifier for the query
- `timeRange` (optional): Time range (1h, 6h, 12h, 24h, 1d, 7d, 30d, 1w, 1m) - Default: 24h
- `compartmentId` (optional): OCI compartment ID (required for execution)
- `environment` (optional): Multi-tenant environment name

#### `search_security_events`
Search for security events using natural language.

**Parameters:**
- `searchTerm` (required): Natural language description
- `eventType` (optional): Event type filter (login, privilege_escalation, network_anomaly, data_exfiltration, malware, all)
- `timeRange` (optional): Time range - Default: 24h
- `limit` (optional): Maximum results - Default: 100

#### `get_mitre_techniques`
Search for MITRE ATT&CK techniques in logs.

**Parameters:**
- `techniqueId` (optional): Specific technique ID (e.g., T1003, T1110) or "all"
- `category` (optional): MITRE tactic category (initial_access, execution, persistence, etc.)
- `timeRange` (optional): Time range - Default: 30d (recommended for Sysmon data)

#### `analyze_ip_activity`
Comprehensive IP address activity analysis.

**Parameters:**
- `ipAddress` (required): IP address to analyze
- `analysisType` (optional): Type of analysis (full, authentication, network, threat_intel, communication_patterns) - Default: full
- `timeRange` (optional): Time range - Default: 24h

### Dashboard Management Tools

#### `list_dashboards`
List OCI dashboards from the tenant.

**Parameters:**
- `compartmentId` (optional): OCI compartment OCID (uses default if not provided)
- `displayName` (optional): Filter dashboards by display name (partial match)
- `lifecycleState` (optional): Filter by lifecycle state (CREATING, UPDATING, ACTIVE, DELETING, DELETED, FAILED) - Default: ACTIVE
- `limit` (optional): Maximum number of dashboards to return - Default: 50

#### `get_dashboard`
Get details of a specific OCI dashboard.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard to retrieve
- `compartmentId` (optional): OCI compartment OCID (for validation)

#### `get_dashboard_tiles`
Get tiles/widgets from a specific OCI dashboard.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard
- `tileType` (optional): Filter tiles by type (all, query, visualization, metric, text)

#### `create_dashboard`
Create a new dashboard with queries and visualizations.

**Parameters:**
- `displayName` (required): Display name for the dashboard
- `description` (optional): Description of the dashboard
- `compartmentId` (optional): OCI compartment OCID (uses default if not provided)
- `dashboardConfig` (optional): Dashboard configuration including widgets array

#### `update_dashboard`
Update an existing dashboard.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard to update
- `displayName` (optional): New display name
- `description` (optional): New description
- `addWidgets` (optional): Array of widgets to add
- `removeWidgetIds` (optional): Array of widget IDs to remove

#### `export_dashboard`
Export dashboard configuration as JSON.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard to export
- `includeQueries` (optional): Include full query definitions - Default: true

#### `import_dashboard`
Import dashboard from JSON configuration.

**Parameters:**
- `dashboardJson` (required): JSON string containing dashboard configuration
- `compartmentId` (optional): Target compartment OCID (uses default if not provided)
- `newDisplayName` (optional): Override display name

### Saved Search Tools

#### `create_saved_search`
Create a saved search in Log Analytics.

**Parameters:**
- `displayName` (required): Display name for the saved search
- `query` (required): Logan query to save
- `description` (optional): Description of the saved search
- `compartmentId` (optional): OCI compartment OCID (uses default if not provided)
- `widgetType` (optional): Preferred visualization type (SEARCH, CHART, TABLE, METRIC) - Default: SEARCH

#### `list_saved_searches`
List saved searches from Log Analytics.

**Parameters:**
- `compartmentId` (optional): OCI compartment OCID (uses default if not provided)
- `displayName` (optional): Filter by display name
- `limit` (optional): Maximum number of results - Default: 50

### Utility Tools

#### `get_logan_queries`
Get predefined Logan Security Dashboard queries.

**Parameters:**
- `category` (optional): Query category (mitre-attack, security, network, authentication, privilege-escalation, all)
- `queryName` (optional): Specific query name

#### `validate_query`
Validate OCI query syntax with auto-fix suggestions.

**Parameters:**
- `query` (required): Query to validate
- `fix` (optional): Attempt automatic fixes - Default: false

#### `get_documentation`
Get documentation and help for OCI queries.

**Parameters:**
- `topic` (optional): Documentation topic (query_syntax, field_names, functions, time_filters, operators, mitre_mapping, examples, troubleshooting)
- `searchTerm` (optional): Specific term to search for in documentation

#### `check_oci_connection`
Test OCI connection and authentication.

**Parameters:**
- `testQuery` (optional): Run test query - Default: true

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OCI_COMPARTMENT_ID` | Default compartment ID | Required |
| `OCI_REGION` | OCI region | us-ashburn-1 |
| `OCI_NAMESPACE` | Object storage namespace | Auto-detected |
| `OCI_USER_ID` | User OCID | From config file |
| `OCI_TENANCY_ID` | Tenancy OCID | From config file |
| `OCI_FINGERPRINT` | Key fingerprint | From config file |
| `OCI_KEY_FILE` | Private key file path | From config file |

### Multi-tenant Configuration

For multiple OCI environments, create a configuration file:

```json
{
  "environments": {
    "production": {
      "compartmentId": "ocid1.compartment.oc1..prod",
      "region": "us-ashburn-1"
    },
    "development": {
      "compartmentId": "ocid1.compartment.oc1..dev", 
      "region": "us-phoenix-1"
    }
  }
}
```

## Query Syntax Guide

### Field Names
Always quote field names with spaces:
```
'Event Name' = 'UserLogin'
'User Name' contains 'admin'
'IP Address' = '192.168.1.100'
```

### Time Filters
Use capitalized 'Time' field:
```
Time > dateRelative(24h)  # Last 24 hours
Time > dateRelative(7d)   # Last 7 days
```

### Common Patterns
```sql
-- Failed logins
'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'

-- Network connections
'Log Source' = 'VCN Flow Logs' and Time > dateRelative(1h) | stats count by 'Source IP'

-- MITRE techniques
'Technique_id' is not null and Time > dateRelative(7d) | stats count by 'Technique_id'
```

## Troubleshooting

### Common Issues

**"Missing input" Error**
- Check field name capitalization: use 'Time' not 'time'
- Quote field names with spaces
- Verify operator syntax

**Authentication Errors**
- Verify OCI CLI configuration: `oci iam user get --user-id <user-ocid>`
- Check compartment permissions
- Validate key file permissions

**No Results**
- Verify time range is appropriate
- Check compartment has log data
- Ensure log sources are configured

### Performance Tips

1. Always include time filters
2. Use specific field filters early in queries
3. Limit result sets with `| head 100`
4. Use indexed fields for filtering

## Development

### Building from Source

```bash
npm run build    # Compile TypeScript
npm run dev      # Development mode
npm run test     # Run tests
```

### Git Repository Setup

The repository is configured to exclude unnecessary files from version control:

**Ignored Files:**
- `python/venv/` - Python virtual environment (created by setup-python.sh)
- `dist/` (optional) - TypeScript compiled output
- `claude_desktop_config.json` - Local Claude Desktop configuration
- Debug logs (`*.log`, `/tmp/mcp-*.log`)
- Credentials (`*.pem`, `*.key`, `config`)
- Test files (`test-*.js`, `test-*.ts`)

**Setup for New Developers:**
1. Copy `claude_desktop_config.json.template` to `claude_desktop_config.json`
2. Update paths and OCI compartment ID in the config
3. Run `./setup-python.sh` to create Python virtual environment
4. The `python/venv/` directory will be automatically ignored

### Project Structure

```
src/
├── index.ts              # Main MCP server with all 16 tools
├── oci/
│   └── LogAnalyticsClient.ts  # OCI integration with dashboard support
└── utils/
    ├── QueryValidator.ts      # Query validation and syntax fixing
    ├── QueryTransformer.ts    # Query transformation and MITRE mapping
    └── DocumentationLookup.ts # Help system

python/
├── logan_client.py       # Python Logan client for query execution
├── dashboard_client.py   # Dashboard management client
├── security_analyzer.py  # Security event analysis
├── query_mapper.py       # Query mapping utilities
├── query_validator.py    # Python query validation
└── requirements.txt      # Python dependencies

test files:
├── test-server.js        # Server functionality tests
├── test-oci-direct.js    # Direct OCI connection tests
├── test-time-correlation.js # Time correlation verification
├── test-dashboard-export.js # Dashboard export tests
└── test-time-update.js   # Time update tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: Built-in help system
- **Issues**: GitHub issues
- **Security**: Report security issues privately

---

## Recent Updates

### v1.2.0 - Time Correlation Fix (July 2025)
- ✅ **Fixed time correlation**: All queries now show accurate data periods with date ranges
- 📊 **Enhanced dashboard management**: Added full dashboard CRUD operations
- 🔍 **Improved saved searches**: Create and manage reusable query templates
- 🐛 **Query syntax fixes**: Automatic OCI compatibility fixes for common syntax issues
- 📝 **Better documentation**: Comprehensive help system with examples

### Key Improvements
- **Time Display**: Shows "Last 30 Days (2025-06-29 to 2025-07-29)" instead of generic "30d"
- **Cross-Log Correlation**: Consistent time periods across different log sources
- **Dashboard Tools**: 6 new dashboard management functions
- **Python Integration**: Robust Python backend for query execution
- **Debug Logging**: Extensive troubleshooting capabilities

**Version**: 1.2.0  
**Last Updated**: July 2025