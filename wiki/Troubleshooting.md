# Troubleshooting Guide

Common issues and solutions for the MCP OCI Logan Server.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Configuration Issues](#configuration-issues)
3. [Authentication Issues](#authentication-issues)
4. [Query Issues](#query-issues)
5. [Connection Issues](#connection-issues)
6. [Performance Issues](#performance-issues)
7. [Data Issues](#data-issues)
8. [Advanced Troubleshooting](#advanced-troubleshooting)

---

## Installation Issues

### Node.js Not Found

**Symptom**:
```
bash: node: command not found
```

**Solution**:
```bash
# macOS (using Homebrew)
brew install node

# Windows (using Chocolatey)
choco install nodejs

# Or download from nodejs.org
# Verify installation
node --version  # Should be 18.0.0 or higher
```

---

### Python Not Found

**Symptom**:
```
bash: python3: command not found
```

**Solution**:
```bash
# macOS
brew install python3

# Windows
choco install python

# Verify installation
python3 --version  # Should be 3.8 or higher
```

---

### npm install Fails

**Symptom**:
```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

**Solution 1** (Recommended - Use nvm):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js via nvm
nvm install 18
nvm use 18
```

**Solution 2** (Fix permissions):
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### Python Virtual Environment Fails

**Symptom**:
```
Error: Command '['/path/to/venv/bin/python3', '-Im', 'ensurepip', '--upgrade', '--default-pip']' returned non-zero exit status 1
```

**Solution**:
```bash
# Install python3-venv (Ubuntu/Debian)
sudo apt-get install python3-venv

# Or reinstall Python with venv
brew reinstall python3  # macOS

# Try creating venv again
cd python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

### TypeScript Build Fails

**Symptom**:
```
error TS2307: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clean and rebuild
rm -rf dist
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.x
```

---

## Configuration Issues

### Claude Desktop Not Showing MCP Tools

**Symptom**: MCP server installed but tools not appearing in Claude Desktop

**Checklist**:

1. **Verify configuration file syntax**:
```bash
# Check JSON syntax
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
```

2. **Use absolute paths**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": [
        "/Users/yourname/mcp-oci-logan-server/dist/index.js"  // ✅ Absolute path
      ]
    }
  }
}
```

NOT:
```json
{
  "args": ["./dist/index.js"]  // ❌ Relative path won't work
}
```

3. **Restart Claude Desktop completely**:
```bash
# macOS - Force quit
killall Claude
# Then reopen Claude Desktop
```

4. **Check Claude Desktop logs**:
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Look for error messages related to oci-logan
```

---

### Invalid JSON Configuration

**Symptom**:
```
Error: Invalid JSON in configuration file
```

**Solution**:
```bash
# Validate JSON syntax
python3 -c "import json; json.load(open('~/Library/Application Support/Claude/claude_desktop_config.json'))"

# Common issues:
# - Missing commas between objects
# - Trailing commas (not allowed in JSON)
# - Unescaped backslashes in paths
# - Missing quotes around strings
```

**Example of valid JSON**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..aaaaa",
        "OCI_REGION": "us-ashburn-1"
      }
    }
  }
}
```

---

### Environment Variables Not Working

**Symptom**: OCI connection fails despite setting environment variables

**Solution**:

Environment variables must be set in Claude Desktop config, not in terminal:

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..your-id",
        "OCI_REGION": "us-ashburn-1",
        "LOGAN_DEBUG": "true"
      }
    }
  }
}
```

---

## Authentication Issues

### OCI CLI Not Configured

**Symptom**:
```
ConfigFileNotFound: Could not find config file at ~/.oci/config
```

**Solution**:
```bash
# Run OCI CLI setup
oci setup config

# Or create config manually
mkdir -p ~/.oci
cat > ~/.oci/config <<EOF
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaa...
fingerprint=aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99
tenancy=ocid1.tenancy.oc1..aaaaaaaa...
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
EOF

# Set correct permissions
chmod 600 ~/.oci/config
chmod 600 ~/.oci/oci_api_key.pem
```

**Verify**:
```bash
oci iam region list
```

---

### Invalid API Key

**Symptom**:
```
NotAuthenticated: Invalid API key or key file
```

**Solution**:

1. **Check key file permissions**:
```bash
ls -la ~/.oci/oci_api_key.pem
# Should be -rw------- (600)
chmod 600 ~/.oci/oci_api_key.pem
```

2. **Verify key fingerprint matches**:
```bash
# Calculate fingerprint from key file
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c

# Compare with fingerprint in config file
grep fingerprint ~/.oci/config
```

3. **Regenerate API key if needed**:
   - Go to OCI Console → Identity → Users → API Keys
   - Delete old key
   - Add new key
   - Update config file with new fingerprint

---

### Insufficient Permissions

**Symptom**:
```
NotAuthorizedOrNotFound: Authorization failed or requested resource not found
```

**Solution**:

1. **Verify compartment access**:
```bash
oci iam compartment get --compartment-id <your-compartment-ocid>
```

2. **Check IAM policies**:

Required policies for Logging Analytics:
```
Allow group LogAnalyticsUsers to read log-analytics-namespaces in compartment <compartment-name>
Allow group LogAnalyticsUsers to manage log-analytics-query-results in compartment <compartment-name>
Allow group LogAnalyticsUsers to read log-analytics-entities in compartment <compartment-name>
Allow group LogAnalyticsUsers to read log-analytics-log-groups in compartment <compartment-name>
```

3. **Use correct compartment OCID**:
```bash
# List all compartments you have access to
oci iam compartment list --all

# Use the correct compartment OCID in your config
```

---

## Query Issues

### Query Syntax Errors

**Symptom**:
```
Query parse error: Missing input at 'time'
```

**Common Issues and Fixes**:

| Issue | Wrong | Correct |
|-------|-------|---------|
| Capitalization | `time > dateRelative(24h)` | `Time > dateRelative(24h)` |
| Field names with spaces | `Event Name = 'failed'` | `'Event Name' = 'failed'` |
| Null comparison | `field != null` | `field is not null` |
| String comparison | `field = value` | `field = 'value'` |

**Use Query Validator**:
```
"Can you validate this query: time > dateRelative(24h)"
```

The validator will auto-fix common issues.

---

### No Query Results

**Symptom**: Query executes successfully but returns no results

**Possible Causes**:

1. **Time range too narrow**:
```
# Instead of 1 hour
Time > dateRelative(1h)

# Try 24 hours or 7 days
Time > dateRelative(24h)
Time > dateRelative(7d)
```

2. **Wrong compartment**:
```bash
# Verify you're using correct compartment
oci log-analytics log-group list --compartment-id <your-compartment-ocid>
```

3. **No logs ingested**:
```bash
# Check if logs exist in compartment
oci log-analytics storage list-recalled-data --compartment-id <your-ocid>
```

4. **Field name incorrect**:
```
# Use list_log_fields tool to see available fields
"List all available log fields"

# Then use exact field name from the list
```

**Debug Steps**:
```
# 1. Check connection
"Check OCI connection status"

# 2. List log sources
"Show me all log sources"

# 3. Try simple query
"Execute query: * | head 10"

# 4. Check time range
"Execute query: * and Time > dateRelative(7d) | stats count"
```

---

### Incomplete Results (Only 1-2 Log Sources)

**Symptom**: `list_log_sources` only returns 1-2 sources when you have many more

**Solution**: Update to v1.3.0 which fixes this issue

```bash
# Check current version
cat package.json | grep version

# Update if needed
git pull origin master
./quick-start.sh
```

**Why this happened**: Earlier versions used `execute_query()` which embedded time filters incorrectly. v1.3.0 uses `execute_query_like_console()` which returns all sources correctly.

---

### Query Timeout

**Symptom**:
```
Query execution timeout after 120 seconds
```

**Solution**:

1. **Optimize query**:
```
# Instead of
* | stats count by 'Field1', 'Field2', 'Field3'

# Use specific log source
'Log Source' = 'Linux Syslog Logs' | stats count by 'Field1'
```

2. **Reduce time range**:
```
# Instead of 30 days
Time > dateRelative(30d)

# Try 7 days first
Time > dateRelative(7d)
```

3. **Use head to limit results**:
```
* and Time > dateRelative(24h) | stats count by 'Log Source' | head 10
```

---

## Connection Issues

### MCP Server Won't Start

**Symptom**: Server fails to start when Claude Desktop tries to connect

**Debug Steps**:

1. **Enable debug mode**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "env": {
        "LOGAN_DEBUG": "true"
      }
    }
  }
}
```

2. **Test server manually**:
```bash
cd /path/to/mcp-oci-logan-server
export LOGAN_DEBUG=true
export OCI_COMPARTMENT_ID=ocid1.compartment.oc1..your-id
node dist/index.js
```

3. **Check for errors**:
   - Look for missing dependencies
   - Python path issues
   - OCI config issues

4. **Check Python environment**:
```bash
cd python
source venv/bin/activate
python logan_client.py --help
```

---

### Python Process Spawning Issues

**Symptom**:
```
Error: spawn ENOENT
Error: Python script not found
```

**Cause**: Hardcoded Python paths in the code

**Solution**:

1. **Verify Python venv exists**:
```bash
ls -la python/venv/bin/python
```

2. **Recreate venv if needed**:
```bash
./setup-python.sh
```

3. **Check dist/index.js paths**:
```bash
# Python scripts should be referenced relative to project root
grep -n "logan_client.py" dist/index.js
```

**Temporary Workaround**:
Set environment variable:
```json
{
  "env": {
    "PYTHON_PATH": "/absolute/path/to/mcp-oci-logan-server/python/venv/bin/python"
  }
}
```

---

### Network Connection Issues

**Symptom**:
```
Network error: Connection refused
Connection timeout
```

**Solution**:

1. **Check internet connectivity**:
```bash
ping oracle.com
```

2. **Check OCI region endpoint**:
```bash
# For us-ashburn-1
ping loganalytics.us-ashburn-1.oci.oraclecloud.com
```

3. **Check firewall/proxy**:
```bash
# If behind corporate proxy
export https_proxy=http://proxy.company.com:8080
export no_proxy=localhost,127.0.0.1
```

4. **Verify OCI service status**:
   - Check [OCI Status Page](https://ocistatus.oraclecloud.com/)

---

## Performance Issues

### Slow Query Execution

**Symptom**: Queries taking > 30 seconds

**Solutions**:

1. **Use specific log sources**:
```
# Instead of
* | stats count

# Use
'Log Source' = 'Linux Syslog Logs' | stats count
```

2. **Limit time range**:
```
# 24 hours instead of 30 days for initial exploration
Time > dateRelative(24h)
```

3. **Use head to limit results**:
```
* | stats count by 'Field' | sort count desc | head 10
```

4. **Add time filter early in query**:
```
# Good
Time > dateRelative(1h) and 'Log Source' = 'X' | stats count

# Bad
'Log Source' = 'X' | stats count  # Time filter applied implicitly later
```

---

### High Memory Usage

**Symptom**: Node.js process using excessive memory

**Solution**:

1. **Increase Node.js memory limit**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": [
        "--max-old-space-size=4096",
        "/path/to/dist/index.js"
      ]
    }
  }
}
```

2. **Limit result set size**:
```
# Add max_count parameter
execute_logan_query(query="...", max_count=1000)
```

---

## Data Issues

### Missing MITRE Techniques

**Symptom**: MITRE query returns no results

**Cause**: Requires Sysmon log data with technique_id fields

**Solution**:

1. **Verify Sysmon logs exist**:
```
"List all log sources"
# Look for Sysmon or Windows Event Logs
```

2. **Check for technique_id field**:
```
"List all available log fields"
# Look for 'Technique_id' or 'technique_id'
```

3. **Use longer time range**:
```
# Sysmon data may be sparse, use 30 days
"Show MITRE techniques from last 30 days"
```

4. **If no Sysmon data**:
   - Configure Sysmon on Windows hosts
   - Ingest Sysmon logs to OCI Logging Analytics
   - Wait for data collection (may take hours/days)

---

### Duplicate Log Entries

**Symptom**: Same log appearing multiple times

**Cause**: Multiple log sources or overlapping time ranges

**Solution**:

1. **Use distinct in query**:
```
* | dedup 'Message', 'Time' | stats count
```

2. **Filter by specific log source**:
```
'Log Source' = 'Linux Syslog Logs' | ...
```

---

### Timestamp Issues

**Symptom**: Logs showing wrong timestamps or timezone

**Solution**:

The server uses UTC for all operations. If you see unexpected times:

1. **Check your timezone interpretation**:
```
# All queries use UTC
Time > dateRelative(24h)  # Last 24 hours in UTC
```

2. **Convert to local time in results**:
```
# Note: Timestamps in results are always UTC
# Convert on display side if needed
```

---

## Advanced Troubleshooting

### Enable Debug Logging

**Full Debug Mode**:

```json
{
  "mcpServers": {
    "oci-logan": {
      "env": {
        "LOGAN_DEBUG": "true",
        "NODE_DEBUG": "mcp*"
      }
    }
  }
}
```

**Check Logs**:
```bash
# Claude Desktop logs (macOS)
tail -f ~/Library/Logs/Claude/mcp*.log

# Python debug output goes to stderr
# Will appear in Claude Desktop logs when LOGAN_DEBUG=true
```

---

### Manual Testing

**Test Python Backend Directly**:

```bash
cd python
source venv/bin/activate

# Test query execution
python logan_client.py \
  --compartment-id ocid1.compartment.oc1..your-id \
  --query "* | stats count by 'Log Source'" \
  --time-period 1440

# Test with debug
export LOGAN_DEBUG=true
python logan_client.py --compartment-id <id> --query "* | head 10" --time-period 60
```

**Test TypeScript Server**:

```bash
# Build
npm run build

# Run with debug
export LOGAN_DEBUG=true
export OCI_COMPARTMENT_ID=ocid1.compartment.oc1..your-id
node dist/index.js

# Server should start and wait for MCP messages on stdin
# Press Ctrl+C to stop
```

---

### Reinstall from Scratch

If all else fails:

```bash
# 1. Backup configuration
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/claude_config_backup.json

# 2. Clean installation
cd /path/to/mcp-oci-logan-server
rm -rf node_modules dist python/venv
npm cache clean --force

# 3. Reinstall
./install.sh

# 4. Restore configuration
cp ~/claude_config_backup.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 5. Restart Claude Desktop
killall Claude
# Then reopen
```

---

## Getting Help

### Before Asking for Help

Please gather this information:

1. **Version information**:
```bash
cat package.json | grep version
node --version
python3 --version
oci --version
```

2. **Error messages**:
   - Full error text
   - Claude Desktop logs
   - Python debug output

3. **Configuration** (sanitized):
```bash
# Remove sensitive info before sharing
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

4. **What you've tried**:
   - List troubleshooting steps already attempted

### Where to Get Help

- **Documentation**: Check [docs/](https://github.com/yourusername/mcp-oci-logan-server/tree/master/docs)
- **GitHub Issues**: [Report Bug](https://github.com/yourusername/mcp-oci-logan-server/issues/new?template=bug_report.md)
- **GitHub Discussions**: [Ask Question](https://github.com/yourusername/mcp-oci-logan-server/discussions)
- **Wiki**: [MCP OCI Logan Server Wiki](https://github.com/yourusername/mcp-oci-logan-server/wiki)

---

## Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `ConfigFileNotFound` | No OCI config | Run `oci setup config` |
| `NotAuthenticated` | Invalid credentials | Check API key and fingerprint |
| `NotAuthorizedOrNotFound` | No permission | Check IAM policies |
| `Query parse error` | Syntax error | Use query validator |
| `spawn ENOENT` | Python not found | Run `./setup-python.sh` |
| `Connection timeout` | Network issue | Check connectivity |
| `Invalid JSON` | Config syntax error | Validate JSON syntax |

---

**Last Updated**: October 2025
**Version**: 1.3.0

See [Installation](Installation) for setup instructions.
