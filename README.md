# MCP OCI Logan Server

A Model Context Protocol (MCP) server that connects Claude to Oracle Cloud Infrastructure (OCI) Logging Analytics, enabling natural language querying and analysis of security logs from the Logan Security Dashboard.

## Features

### 🔍 Query Execution
- **Execute Logan Queries**: Run predefined Logan Security Dashboard queries against OCI Logging Analytics
- **Natural Language Search**: Convert natural language to OCI query syntax
- **MITRE ATT&CK Integration**: Search for specific MITRE techniques and tactics
- **IP Activity Analysis**: Comprehensive analysis of IP address behavior

### 🛡️ Security Analysis
- **Security Event Search**: Find authentication failures, privilege escalations, network anomalies
- **Threat Intelligence**: Analyze suspicious activities and threat patterns
- **RITA Integration**: Network behavior analysis capabilities
- **Real-time Monitoring**: Query live security events and logs

### 🔧 Developer Tools
- **Query Validation**: Syntax validation with automatic error fixing
- **Documentation Lookup**: Built-in help system for OCI query syntax
- **Connection Testing**: Verify OCI authentication and connectivity
- **Error Handling**: Comprehensive error reporting and troubleshooting

### 🏢 Enterprise Features
- **Multi-tenant Support**: Query across multiple OCI environments
- **Authentication Methods**: Support for config files, instance principals, and resource principals
- **Performance Optimization**: Intelligent query optimization and caching

## Prerequisites

1. **OCI Account**: Access to Oracle Cloud Infrastructure
2. **OCI CLI**: Configured with appropriate credentials
3. **Logan Security Dashboard**: Working installation (optional, for predefined queries)
4. **Claude Desktop**: For MCP integration

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
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

### 3. Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/path/to/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..xxx",
        "OCI_REGION": "us-ashburn-1"
      }
    }
  }
}
```

### 4. Test Installation

```bash
# Test OCI connection
npm run test

# Start the server
npm start
```

## Usage Examples

### Basic Query Execution

```
Execute this Logan query: 'Event Name' = 'UserLoginFailed' and Time > dateRelative(24h) | stats count by 'User Name'
```

### Natural Language Security Search

```
Search for failed login attempts in the last 24 hours
```

### MITRE ATT&CK Analysis

```
Find all credential access techniques in the last week
```

### IP Investigation

```
Analyze all activity for IP address 192.168.1.100 in the last 24 hours
```

### Documentation Lookup

```
Show me the documentation for OCI query syntax
```

## Available Tools

### `execute_logan_query`
Execute OCI Logging Analytics queries with validation and error handling.

**Parameters:**
- `query` (required): OCI Logging Analytics query
- `timeRange` (optional): Time range (24h, 7d, 30d)
- `compartmentId` (optional): OCI compartment ID
- `environment` (optional): Multi-tenant environment name

### `search_security_events`
Search for security events using natural language.

**Parameters:**
- `searchTerm` (required): Natural language description
- `eventType` (optional): Event type filter
- `timeRange` (optional): Time range
- `limit` (optional): Maximum results

### `get_mitre_techniques`
Search for MITRE ATT&CK techniques in logs.

**Parameters:**
- `techniqueId` (optional): Specific technique ID
- `category` (optional): MITRE tactic category
- `timeRange` (optional): Time range

### `analyze_ip_activity`
Comprehensive IP address activity analysis.

**Parameters:**
- `ipAddress` (required): IP address to analyze
- `analysisType` (optional): Type of analysis
- `timeRange` (optional): Time range

### `get_logan_queries`
Get predefined Logan Security Dashboard queries.

**Parameters:**
- `category` (optional): Query category
- `queryName` (optional): Specific query name

### `validate_query`
Validate OCI query syntax with auto-fix suggestions.

**Parameters:**
- `query` (required): Query to validate
- `fix` (optional): Attempt automatic fixes

### `get_documentation`
Get documentation and help for OCI queries.

**Parameters:**
- `topic` (optional): Documentation topic
- `searchTerm` (optional): Search term

### `check_oci_connection`
Test OCI connection and authentication.

**Parameters:**
- `testQuery` (optional): Run test query

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

### Project Structure

```
src/
├── index.ts              # Main MCP server
├── oci/
│   └── LogAnalyticsClient.ts  # OCI integration
└── utils/
    ├── QueryValidator.ts      # Query validation
    ├── QueryTransformer.ts    # Query transformation
    └── DocumentationLookup.ts # Help system
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

**Version**: 1.0.0  
**Author**: Logan Security Dashboard Team  
**Last Updated**: January 2025