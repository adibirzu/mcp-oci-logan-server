# Installation Guide

Complete installation guide for the MCP OCI Logan Server.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Install](#quick-install)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Check Command | Install Guide |
|----------|---------|---------------|---------------|
| **Node.js** | 18.0.0+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0.0+ | `npm --version` | Included with Node.js |
| **Python** | 3.8+ | `python3 --version` | [python.org](https://www.python.org/) |
| **pip** | Latest | `pip3 --version` | Included with Python |
| **OCI CLI** | Latest | `oci --version` | [OCI CLI Install](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm) |

### OCI Requirements

- **OCI Account** with active tenancy
- **Logging Analytics** service enabled
- **Compartment OCID** with log sources
- **OCI Config** file configured (`~/.oci/config`)
- **IAM Permissions** to access Logging Analytics

### Verify OCI CLI

```bash
# Test OCI CLI authentication
oci iam region list

# Verify compartment access
oci iam compartment get --compartment-id <your-compartment-ocid>
```

---

## Quick Install

### Automated Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-oci-logan-server.git
cd mcp-oci-logan-server

# Run the automated installer
./install.sh
```

The installer will:
1. ✅ Check all prerequisites (Node.js, Python, OCI CLI)
2. ✅ Install Node.js dependencies
3. ✅ Set up Python virtual environment
4. ✅ Install Python dependencies (OCI SDK)
5. ✅ Build TypeScript to JavaScript
6. ✅ Run installation tests
7. ✅ Verify all 33 MCP tools
8. ✅ Configure Claude Desktop (optional)

### Installation Output

```
╔════════════════════════════════════════════════════════════╗
║      MCP OCI Logan Server - Automated Installer v1.3      ║
╚════════════════════════════════════════════════════════════╝

[1/8] Checking prerequisites...
  ✓ Node.js 18.19.0 installed
  ✓ npm 10.2.3 installed
  ✓ Python 3.11.7 installed
  ✓ pip 23.3.1 installed
  ✓ OCI CLI 3.37.0 installed

[2/8] Installing Node.js dependencies...
  ✓ Installed 42 packages in 5.2s

[3/8] Setting up Python virtual environment...
  ✓ Virtual environment created at python/venv
  ✓ Installed OCI SDK and dependencies

[4/8] Building TypeScript to JavaScript...
  ✓ TypeScript compiled successfully

[5/8] Testing Python backend...
  ✓ logan_client.py working
  ✓ dashboard_client.py working
  ✓ security_analyzer.py working

[6/8] Verifying MCP server...
  ✓ MCP server starts successfully
  ✓ All 33 tools registered

[7/8] Verifying features...
  ✓ Query Execution Tools (4/4)
  ✓ Advanced Analytics Tools (5/5)
  ✓ Resource Management Tools (10/10)
  ✓ Utility Tools (4/4)
  ✓ Dashboard Management Tools (7/7)
  ✓ Saved Search Tools (2/2)
  ⚠ Note: Dashboard tools have limited functionality

[8/8] Claude Desktop Configuration...
  Choose configuration method:
  1) Automatic (recommended)
  2) Manual with template
  3) Skip

Installation Complete! 🎉
```

---

## Manual Installation

If you prefer manual installation or need to troubleshoot:

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/mcp-oci-logan-server.git
cd mcp-oci-logan-server
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Set Up Python Environment

```bash
./setup-python.sh
```

Or manually:

```bash
cd python
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 4: Build TypeScript

```bash
npm run build
```

### Step 5: Verify Installation

```bash
# Test Python clients
cd python
source venv/bin/activate
python logan_client.py --help
python dashboard_client.py --help
python security_analyzer.py --help
cd ..

# Test MCP server (optional - requires Claude Desktop config)
node dist/index.js
```

---

## Configuration

### Claude Desktop Configuration

#### Location

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Template

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-oci-logan-server/dist/index.js"
      ],
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

#### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `command` | Node.js executable | `node` |
| `args` | Absolute path to dist/index.js | `/Users/you/mcp-oci-logan-server/dist/index.js` |
| `OCI_COMPARTMENT_ID` | Your OCI compartment OCID | `ocid1.compartment.oc1..aaaa...` |

#### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OCI_REGION` | OCI region | `us-ashburn-1` |
| `LOGAN_DEBUG` | Enable debug logging | `false` |
| `SUPPRESS_LABEL_WARNING` | Suppress label warnings | `True` |
| `LOGAN_PROJECT_PATH` | Path to Logan dashboard project | `~/logan-security-dashboard` |

### Finding Your Compartment OCID

```bash
# List all compartments
oci iam compartment list --all

# Get specific compartment
oci iam compartment get --compartment-id <ocid>
```

### OCI Authentication

The server uses standard OCI SDK authentication in this order:

1. **OCI Config File** (`~/.oci/config`) - **Recommended**
2. **Environment Variables** (`OCI_*`)
3. **Instance Principal** (when running on OCI Compute)

#### Sample OCI Config File

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaa...
fingerprint=aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99
tenancy=ocid1.tenancy.oc1..aaaaaaaa...
region=us-ashburn-1
key_file=~/.oci/oci_api_key.pem
```

---

## Verification

### 1. Test OCI Connection

```bash
# Test OCI CLI
oci iam region list

# Test with specific compartment
oci log-analytics namespace list \
  --compartment-id <your-compartment-ocid>
```

### 2. Test Python Backend

```bash
cd python
source venv/bin/activate

# Test logan_client
python logan_client.py --help

# Test query execution
python logan_client.py \
  --compartment-id <your-compartment-ocid> \
  --query "* | stats count by 'Log Source'" \
  --time-period 1440
```

### 3. Test MCP Server

Restart Claude Desktop and ask:

```
"Can you check the OCI connection status?"
"Show me all active log sources"
"List available log fields"
```

### 4. Verify All Tools

In Claude Desktop:

```
"What MCP tools are available?"
```

You should see all 33 tools:
- ✅ 4 Query Execution Tools
- ✅ 5 Advanced Analytics Tools
- ✅ 10 Resource Management Tools
- ✅ 4 Utility Tools
- ✅ 7 Dashboard Management Tools (partial)
- ✅ 2 Saved Search Tools (partial)

---

## Troubleshooting

### Prerequisites Issues

#### Node.js Not Found

```bash
# macOS (using Homebrew)
brew install node

# Windows (using Chocolatey)
choco install nodejs

# Or download from nodejs.org
```

#### Python Not Found

```bash
# macOS
brew install python3

# Windows
choco install python

# Or download from python.org
```

#### OCI CLI Not Found

```bash
# macOS/Linux
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Windows
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.ps1'))"
```

### Installation Issues

#### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Python virtual environment fails

```bash
# Make sure Python 3.8+ is installed
python3 --version

# Try creating venv manually
cd python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### TypeScript build fails

```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf dist
npm run build
```

### Configuration Issues

#### OCI Authentication Fails

```bash
# Verify OCI config file exists
cat ~/.oci/config

# Test OCI CLI authentication
oci iam region list

# Check API key permissions
ls -la ~/.oci/oci_api_key.pem
chmod 600 ~/.oci/oci_api_key.pem
```

#### Claude Desktop Doesn't Show MCP Tools

1. **Verify configuration file syntax** (valid JSON)
2. **Use absolute paths** in `args` field
3. **Restart Claude Desktop** completely
4. **Check Claude Desktop logs**:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

#### MCP Server Won't Start

```bash
# Enable debug mode
export LOGAN_DEBUG=true

# Test server manually
node dist/index.js

# Check for error messages in stderr
```

### Query Issues

#### No Results Returned

**Common Causes**:
1. Time range too narrow (try 24h or 7d)
2. Incorrect compartment ID
3. No log data in compartment
4. Query syntax errors

**Solutions**:
```bash
# Test with wider time range
"Show me log sources from the last 7 days"

# Verify compartment has logs
oci log-analytics log-group list \
  --compartment-id <your-compartment-ocid>

# Use query validator
"Can you validate this query: * | stats count by 'Log Source'"
```

#### Query Syntax Errors

Use the `validate_query` tool:

```
"Can you validate and fix this query: time > dateRelative(24h)"
```

The validator will auto-fix common issues:
- `time` → `Time` (capitalization)
- Missing quotes around field names
- `!= null` → `is not null`

### Resource Discovery Issues

#### Only Seeing 1-2 Log Sources

This was fixed in v1.3.0. Make sure you have the latest version:

```bash
# Check version
cat package.json | grep version

# Update to latest
git pull origin master
./quick-start.sh
```

The fix changed `list_active_log_sources` to use `execute_query_like_console()` instead of `execute_query()`, which now returns ALL log sources (12+) like the OCI Console.

---

## Post-Installation

### Recommended Next Steps

1. **Read User Guide**: [docs/USER_GUIDE.md](https://github.com/yourusername/mcp-oci-logan-server/blob/master/docs/USER_GUIDE.md)
2. **Try Example Queries**: See [Capabilities](Capabilities) page
3. **Review Security Best Practices**: See [Security](Security) page
4. **Explore Advanced Features**: See [API Reference](API-Reference)

### Quick Start Questions

Try asking Claude these questions to verify everything works:

```
"Show me all active log sources"
"What log fields are available?"
"List all entities in my namespace"
"Get namespace information"
"Show me security events from the last 24 hours"
"Analyze failed login attempts"
"Show MITRE ATT&CK techniques detected this week"
```

---

## Getting Help

- **Documentation**: [docs/](https://github.com/yourusername/mcp-oci-logan-server/tree/master/docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/mcp-oci-logan-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mcp-oci-logan-server/discussions)

---

**Last Updated**: October 2025
**Version**: 1.3.0
