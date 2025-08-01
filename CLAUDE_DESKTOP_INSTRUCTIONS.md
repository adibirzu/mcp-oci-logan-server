# Claude Desktop Setup - OCI Logan MCP Server

## Quick Setup

1. **Locate your Claude Desktop configuration file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the server configuration**:
   ```json
   {
     "mcpServers": {
       "oci-logan": {
         "command": "node",
         "args": [
           "/Users/abirzu/dev/mcp-oci-logan-server/dist/index.js"
         ],
         "env": {
           "OCI_COMPARTMENT_ID": "your_compartment_ocid_here",
           "SUPPRESS_LABEL_WARNING": "True"
         }
       }
     }
   }
   ```

3. **Update the configuration**:
   - Replace `your_compartment_ocid_here` with your OCI compartment OCID
   - Update the script path to match your installation directory

4. **Restart Claude Desktop**

## Available Tools (17 total)

The server provides comprehensive security analysis and log management:

### Core Query Tools
- `execute_logan_query` - Execute Logan Security Dashboard queries
- `search_security_events` - Search for security events using natural language
- `validate_query` - Validate OCI Logging Analytics query syntax

### Security Analysis
- `get_mitre_techniques` - Search for MITRE ATT&CK techniques
- `analyze_ip_activity` - Analyze activity for specific IP addresses
- `get_logan_queries` - Get predefined security queries

### Documentation & Help
- `get_documentation` - Get help for OCI Logging Analytics
- `check_oci_connection` - Test OCI connectivity

### Dashboard Management
- `list_dashboards` - List OCI dashboards
- `get_dashboard` - Get dashboard details
- `get_dashboard_tiles` - Get dashboard widgets
- `create_dashboard` - Create new dashboards
- `update_dashboard` - Update existing dashboards
- `export_dashboard` - Export dashboard configuration
- `import_dashboard` - Import dashboard from JSON

### Saved Searches
- `create_saved_search` - Create saved searches
- `list_saved_searches` - List saved searches

## Example Queries

Once configured, you can ask Claude:

- "Show me failed login attempts in the last 24 hours"
- "Search for MITRE technique T1110 (brute force) events"
- "Analyze IP activity for 192.168.1.100"
- "List all security dashboards"
- "Execute this Logan query: * | stats count by 'Log Source'"
- "Search for privilege escalation events"

## Requirements

- Node.js installed
- OCI CLI installed and configured  
- OCI Python SDK in Python environment (for backend queries)
- Valid OCI configuration file at `~/.oci/config`
- Access to OCI Logging Analytics

## Troubleshooting

If you encounter issues:

1. **Check Node.js**: Ensure Node.js is installed and accessible
2. **Verify paths**: Ensure the script path points to the compiled dist/index.js
3. **Check OCI config**: Test with `oci logging-analytics namespace list`
4. **Verify compartment**: Ensure your compartment OCID has Logging Analytics access
5. **Python backend**: Ensure the Python environment has required OCI packages