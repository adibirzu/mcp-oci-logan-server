# MCP OCI Logan Server

## ⚠️ Disclaimer

This software was created to showcase Oracle Cloud Infrastructure (OCI) Logging Analytics capabilities and demonstrate how to expand them using third-party services and AI tools. The architecture and code were written by me with the assistance of Oracle Code Assist and multiple LLMs including Claude, OpenAI GPT-4o, Meta Llama 3.2, and Grok 3. This is an educational project designed to learn more about OCI's service capabilities and how to optimize security monitoring tasks through AI integration.

**This is NOT an official Oracle product** - it is a personal project demonstrating integration possibilities with OCI Logging Analytics and AI assistants.

---

A Model Context Protocol (MCP) server that connects Claude to Oracle Cloud Infrastructure (OCI) Logging Analytics, enabling natural language querying and analysis of security logs from the Logan Security Dashboard.

## Features

### 🔍 Core Query Execution (Fully Implemented)
- **Execute Logan Queries**: Direct execution against OCI Logging Analytics API via Python backend
- **Natural Language Search**: AI-powered conversion of natural language to OCI query syntax
- **MITRE ATT&CK Integration**: Search for specific MITRE techniques and tactics with 90-day default range
- **IP Activity Analysis**: Comprehensive analysis with multiple analysis types (authentication, network, threat_intel)
- **Time Correlation**: Precise UTC timezone handling for accurate cross-log correlation
- **Query Syntax Fixing**: Automatic OCI compatibility fixes for common syntax issues
- **Real-time Data**: Direct OCI API integration with NO mock data policy

### 🛡️ Security Analysis (Fully Implemented)
- **Security Event Search**: Advanced pattern matching for authentication failures, privilege escalations
- **Threat Intelligence**: Statistical analysis and anomaly detection
- **Advanced Analytics**: Clustering, NLP processing, outlier detection, correlation analysis
- **Field Operations**: Dynamic field extraction, pattern searching, data transformation
- **Statistical Analysis**: Comprehensive statistical operations on log data
- **Cross-Log Correlation**: Synchronized time periods across different log sources

### 📊 Dashboard Management (Partially Implemented)
- **List Dashboards**: ⚠️ Returns sample data (not connected to real OCI dashboards)
- **Dashboard Details**: Basic functionality via Python client
- **Create/Update Dashboards**: ⚠️ Mock implementations only
- **Export/Import**: Limited JSON-based functionality
- **Saved Searches**: ⚠️ Returns sample data (not connected to real OCI saved searches)

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

## Available Tools (19 Total Implemented)

### Core Query Tools (Fully Functional)

#### `execute_logan_query`
Direct execution of OCI Logging Analytics queries via Python backend with comprehensive validation, syntax fixing, and error handling. Supports real-time data retrieval with NO mock data.

**Parameters:**
- `query` (required): OCI Logging Analytics query
- `queryName` (optional): Name/identifier for the query
- `timeRange` (optional): Time range (1h, 6h, 12h, 24h, 1d, 7d, 30d, 1w, 1m) - Default: 24h
- `compartmentId` (optional): OCI compartment ID (required for execution)
- `environment` (optional): Multi-tenant environment name

#### `search_security_events`
AI-powered natural language to OCI query conversion for security event searching with advanced pattern matching.

**Parameters:**
- `searchTerm` (required): Natural language description
- `eventType` (optional): Event type filter (login, privilege_escalation, network_anomaly, data_exfiltration, malware, all)
- `timeRange` (optional): Time range - Default: 24h
- `limit` (optional): Maximum results - Default: 100

#### `get_mitre_techniques`
Comprehensive MITRE ATT&CK technique analysis with 90-day default range optimized for security data.

**Parameters:**
- `techniqueId` (optional): Specific technique ID (e.g., T1003, T1110) or "all"
- `category` (optional): MITRE tactic category (initial_access, execution, persistence, etc.)
- `timeRange` (optional): Time range - Default: 30d (recommended for Sysmon data)

#### `analyze_ip_activity`
Advanced IP address behavioral analysis with multiple analysis types: full, authentication, network, threat_intel, communication_patterns.

**Parameters:**
- `ipAddress` (required): IP address to analyze
- `analysisType` (optional): Type of analysis (full, authentication, network, threat_intel, communication_patterns) - Default: full
- `timeRange` (optional): Time range - Default: 24h

### Advanced Analytics Tools (Fully Implemented)

#### `perform_statistical_analysis`
Advanced statistical operations on query results including clustering, outlier detection, and trend analysis.

#### `perform_advanced_analytics`
ML-powered analytics including clustering algorithms, NLP processing, and anomaly detection.

#### `search_field_patterns`
Dynamic field pattern searching and extraction from log data.

#### `correlate_events`
Cross-log event correlation with time synchronization and pattern matching.

#### `perform_field_operations`
Field extraction, transformation, and manipulation operations.

### Dashboard Management Tools (Partially Implemented)

#### `list_dashboards` ⚠️ (Limited Implementation)
Returns sample dashboard data. Not connected to real OCI Dashboard/Management APIs.

**Parameters:**
- `compartmentId` (optional): OCI compartment OCID 
- `displayName` (optional): Filter dashboards by display name
- `lifecycleState` (optional): Filter by lifecycle state - Default: ACTIVE
- `limit` (optional): Maximum number of dashboards to return - Default: 50

**Note:** Currently returns mock data. Real OCI dashboard integration pending.

#### `get_dashboard` (Partial Implementation)
Basic dashboard details retrieval via Python client.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard to retrieve
- `compartmentId` (optional): OCI compartment OCID (for validation)

**Note:** Limited functionality. Full implementation requires OCI Management Dashboard SDK.

#### `get_dashboard_tiles`
Get tiles/widgets from a specific OCI dashboard.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard
- `tileType` (optional): Filter tiles by type (all, query, visualization, metric, text)

#### `create_dashboard` ⚠️ (Mock Implementation)
Returns mock response for dashboard creation. Not connected to real OCI APIs.

**Parameters:**
- `displayName` (required): Display name for the dashboard
- `description` (optional): Description of the dashboard
- `compartmentId` (optional): OCI compartment OCID
- `dashboardConfig` (optional): Dashboard configuration

**Note:** Mock implementation only. Real dashboard creation requires OCI SDK integration.

#### `update_dashboard` ⚠️ (Mock Implementation)
Returns mock response for dashboard updates. Not connected to real OCI APIs.

**Parameters:**
- `dashboardId` (required): OCID of the dashboard to update
- `displayName` (optional): New display name
- `description` (optional): New description
- `addWidgets` (optional): Array of widgets to add
- `removeWidgetIds` (optional): Array of widget IDs to remove

**Note:** Mock implementation only.

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

#### `create_saved_search` ⚠️ (Mock Implementation)
Returns sample data for saved search creation. Not connected to real OCI saved search APIs.

**Parameters:**
- `displayName` (required): Display name for the saved search
- `query` (required): Logan query to save
- `description` (optional): Description of the saved search
- `compartmentId` (optional): OCI compartment OCID
- `widgetType` (optional): Preferred visualization type - Default: SEARCH

**Note:** Returns mock data. Real implementation pending.

#### `list_saved_searches` ⚠️ (Mock Implementation)
Returns sample saved search data. Not connected to real OCI APIs.

**Parameters:**
- `compartmentId` (optional): OCI compartment OCID
- `displayName` (optional): Filter by display name
- `limit` (optional): Maximum number of results - Default: 50

**Note:** Returns sample data only.

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

### Implementation Status & Limitations

#### ✅ **Fully Implemented Features:**
- Core query execution with real OCI API integration
- 19 MCP tools for security analysis and log querying
- Python backend with OCI SDK integration
- Advanced analytics (clustering, NLP, statistical analysis)
- Query syntax validation and automatic fixing
- MITRE ATT&CK technique mapping
- IP address behavioral analysis
- Time correlation with UTC timezone handling
- NO mock data policy - all data is real from OCI

#### ⚠️ **Partially Implemented Features:**
- Dashboard listing (returns sample data)
- Dashboard details retrieval (basic functionality)
- Export/import capabilities (limited)

#### ❌ **Mock/Placeholder Features:**
- Dashboard creation and modification
- Saved search management
- RITA network analysis integration

#### 🔧 **Known Technical Issues:**
- Hardcoded Python script paths (requires manual configuration)
- Limited error handling for Python process failures
- Dashboard management APIs not connected to real OCI services
- Path resolution issues on different systems

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

### Actual Architecture & Data Flow

```
Claude/AI Assistant
        ↓
MCP Protocol (stdio)
        ↓
TypeScript Server (src/index.ts) - 19 MCP Tools
        ↓
LogAnalyticsClient.ts - OCI Integration Layer
        ↓
Python Process Spawn (child_process)
        ↓
Python Backend (logan_client.py, dashboard_client.py)
        ↓
OCI SDK (Python) - Direct API Calls
        ↓
OCI Log Analytics API (Real Data - NO Mock Policy)
```

### Project Structure (Actual Implementation)

```
src/
├── index.ts              # Main MCP server with 19 implemented tools
├── oci/
│   └── LogAnalyticsClient.ts  # OCI integration with Python backend spawning
└── utils/
    ├── QueryValidator.ts      # Query validation and syntax fixing
    ├── QueryTransformer.ts    # Query transformation and MITRE mapping
    └── DocumentationLookup.ts # Built-in help system

python/
├── venv/                 # Python virtual environment (created by setup-python.sh)
├── logan_client.py       # Primary OCI Log Analytics client (fully functional)
├── dashboard_client.py   # Dashboard operations (partial implementation)
├── security_analyzer.py  # Security event analysis (fully functional)
├── query_mapper.py       # Query mapping utilities
├── query_validator.py    # Python-side query validation
└── requirements.txt      # Python dependencies (oci-sdk, etc.)

test files: (Excluded from git)
├── test-server.js        # MCP server functionality tests
├── test-oci-direct.js    # Direct OCI connection tests
├── test-time-correlation.js # Time correlation verification
├── test-dashboard-export.js # Dashboard export tests
└── test-time-update.js   # Time synchronization tests

config files:
├── claude_desktop_config.json.template # Claude Desktop MCP configuration
├── setup-python.sh      # Python environment setup script
└── .gitignore           # Excludes venv/, test files, credentials
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

### v1.2.0 - Architecture Analysis & Documentation Update (August 2025)
- ✅ **Code Analysis Complete**: Comprehensive codebase analysis revealing actual vs documented features
- 📊 **Dashboard Status Clarified**: Updated documentation to reflect partial/mock implementations
- 🔍 **Tool Inventory Corrected**: 19 total tools with accurate implementation status
- 🐛 **Technical Debt Identified**: Hardcoded paths, mock implementations documented
- 📝 **Architecture Documented**: Real data flow and Python backend integration detailed
- 🔄 **License Reverted**: Changed from Apache License back to MIT

### Implementation Reality Check
- **Query Execution**: ✅ Fully functional with real OCI API integration
- **Security Analytics**: ✅ Complete implementation with advanced analytics
- **Dashboard Management**: ⚠️ Partial/mock implementations only
- **Python Backend**: ✅ Robust integration with OCI SDK
- **Time Correlation**: ✅ Accurate UTC timezone handling
- **NO Mock Data**: ✅ Strict policy enforced for query results

### Next Development Priorities
1. Fix hardcoded Python script paths
2. Implement real OCI Dashboard/Management API integration
3. Add comprehensive error handling
4. Implement query template library
5. Add configuration management system

**Version**: 1.2.0  
**Last Updated**: August 2025