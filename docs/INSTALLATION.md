# Installation Guide - MCP OCI Logan Server v1.3.0

Complete installation guide for the MCP OCI Logan Server with automated setup, manual options, and troubleshooting.

## Table of Contents

1. [Quick Install (Recommended)](#quick-install-recommended)
2. [Prerequisites](#prerequisites)
3. [Automated Installation](#automated-installation)
4. [Manual Installation](#manual-installation)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Upgrade Guide](#upgrade-guide)

---

## Quick Install (Recommended) 🚀

**For first-time users**, use the automated installer:

```bash
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server
./install.sh
```

The installer handles everything automatically:
- ✅ Checks prerequisites (Node.js 18+, Python 3.8+, OCI CLI)
- ✅ Installs all dependencies
- ✅ Sets up Python virtual environment
- ✅ Builds TypeScript code
- ✅ Tests the installation (Node build + Python/FastMCP compile checks)
- ✅ Optionally configures Claude Desktop
- ✅ Verifies all 33 MCP tools

**Total time**: 2-5 minutes (depending on internet speed)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Check Command | Install Link |
|----------|----------------|---------------|--------------|
| **Node.js** | v18.0.0+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | v8.0.0+ | `npm --version` | Included with Node.js |
| **Python** | 3.8+ | `python3 --version` | [python.org](https://www.python.org/) |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com/) |

### Recommended Software

| Software | Purpose | Check Command | Install Link |
|----------|---------|---------------|--------------|
| **OCI CLI** | Authentication & testing | `oci --version` | [OCI CLI Docs](https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm) |
| **Claude Desktop** | Using the MCP server | Check Applications folder | [claude.ai](https://claude.ai/) |

### OCI Requirements

- ✅ Active OCI account
- ✅ OCI Logging Analytics enabled in your tenancy
- ✅ Compartment OCID where Logging Analytics is configured
- ✅ API key configured (for OCI CLI)
- ✅ Appropriate IAM policies for Logging Analytics access

---

## Automated Installation

### Step 1: Run the Installer

```bash
cd mcp-oci-logan-server
./install.sh
```

### Step 2: Follow the Prompts

The installer will guide you through:

1. **Prerequisites Check**
   - Verifies Node.js, Python, and OCI CLI
   - Shows what's installed and what's missing
   - Exits if critical requirements are missing

2. **Dependency Installation**
   - Installs Node.js packages
   - Creates Python virtual environment
   - Installs Python packages (OCI SDK, etc.)

3. **Build Process**
   - Compiles TypeScript to JavaScript
   - Verifies compilation succeeded

4. **Testing**
   - Compiles Python clients (syntax-only, no stdout)
   - Compiles FastMCP server (stdio-safe)
   - Verifies MCP server module structure without running it
   - Shows feature verification

5. **Claude Desktop Configuration**
   - **Option 1**: Automatic (enters compartment ID, configures automatically)
   - **Option 2**: Manual (shows config snippet to add manually)
   - **Option 3**: Skip (configure later)

6. **Summary**
   - Shows installation results
   - Provides next steps
   - Links to documentation

### What Gets Installed

**Node.js Packages** (in `node_modules/`):
- `@modelcontextprotocol/sdk` - MCP framework
- `oci-sdk` - OCI Node.js SDK
- `TypeScript` - Compiler
- Supporting libraries (date-fns, node-fetch, etc.)

**Python Packages** (in `python/venv/`):
- `oci` - OCI Python SDK (v2.135.1+)
- `requests` - HTTP client
- `python-dotenv` - Environment variables
- `mcp[cli]` - FastMCP stdio server support (only when Python ≥ 3.10)

**Compiled Output** (in `dist/`):
- `index.js` - Main MCP server
- `oci/LogAnalyticsClient.js` - OCI integration
- `utils/` - Query validation, transformation, documentation

---

## Manual Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server
```

### Step 2: Install Node Dependencies

```bash
npm install
```

This installs all packages from `package.json`.

### Step 3: Setup Python Environment

```bash
./setup-python.sh
```

This script:
- Creates `python/venv/` virtual environment
- Activates it
- Upgrades pip
- Installs packages from `python/requirements.txt`

### Step 4: Build TypeScript

```bash
npm run build
```

Compiles `src/` TypeScript files to `dist/` JavaScript files.

### Step 5: Configure OCI

**Option A: OCI CLI (Recommended)**

```bash
oci setup config
```

Follow the prompts to create `~/.oci/config`.

**Option B: Environment Variables**

Add to your shell profile (~/.bashrc, ~/.zshrc):

```bash
export OCI_USER_ID="ocid1.user.oc1..xxx"
export OCI_FINGERPRINT="xx:xx:xx:xx..."
export OCI_TENANCY_ID="ocid1.tenancy.oc1..xxx"
export OCI_REGION="us-ashburn-1"
export OCI_KEY_FILE="~/.oci/oci_api_key.pem"
export OCI_COMPARTMENT_ID="ocid1.compartment.oc1..xxx"
```

### Step 6: Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..your-compartment-id",
        "OCI_REGION": "us-ashburn-1",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    },
    "oci-logan-fastmcp": {
      "command": "python",
      "args": ["/ABSOLUTE/PATH/TO/mcp-oci-logan-server/python/fastmcp_server.py"],
      "env": {
        "LOGAN_COMPARTMENT_ID": "ocid1.compartment.oc1..your-compartment-id",
        "LOGAN_REGION": "us-ashburn-1",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
```

**Critical**: Use **absolute paths** for the `args` field!

### Step 7: Test Installation

```bash
# Test Python clients (syntax-only)
python -m py_compile python/logan_client.py python/dashboard_client.py python/query_validator.py

# Test OCI connection
oci iam region list

# Test FastMCP module (syntax-only, requires Python ≥ 3.10)
python - <<'PY'
import sys, py_compile
if sys.version_info >= (3, 10):
    py_compile.compile('python/fastmcp_server.py', doraise=True)
else:
    print("FastMCP server skipped: requires Python 3.10+")
PY

# Restart Claude Desktop and test
```

---

## Configuration

### Claude Desktop Configuration Options

**Required Settings**:
- `OCI_COMPARTMENT_ID` - Your OCI compartment OCID

**Recommended Settings**:
- `OCI_REGION` - Your OCI region (default: us-ashburn-1)

**Optional Settings**:
- `LOGAN_DEBUG` - Enable debug logging (set to "true")
- `LOGAN_PROJECT_PATH` - Path to Logan Security Dashboard project
- `SUPPRESS_LABEL_WARNING` - Suppress label warnings (set to "True")

### Example Configurations

**Basic Configuration**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..xxx"
      }
    }
  }
}
```

**Full Configuration**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..xxx",
        "OCI_REGION": "us-ashburn-1",
        "LOGAN_DEBUG": "false",
        "LOGAN_PROJECT_PATH": "/path/to/logan-security-dashboard",
        "SUPPRESS_LABEL_WARNING": "True"
      }
    }
  }
}
```

**Debug Configuration**:
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..xxx",
        "OCI_REGION": "us-ashburn-1",
        "LOGAN_DEBUG": "true"
      }
    }
  }
}
```

---

## Verification

### Verify Installation

**Check versions**:
```bash
node --version   # Should be v18+
python3 --version # Should be 3.8+
npm --version    # Should be 8+
```

**Check files exist**:
```bash
ls dist/index.js               # Should exist
ls python/venv/bin/python      # Should exist
ls python/venv/lib/python*/site-packages/oci  # OCI SDK installed
```

**Test Python clients**:
```bash
source python/venv/bin/activate
python python/logan_client.py --help
python python/dashboard_client.py --help
python -m py_compile python/fastmcp_server.py  # Syntax check (stdio-safe)
```

**Test OCI connection**:
```bash
oci iam region list  # Should list regions
```

### Verify in Claude Desktop

1. **Restart Claude Desktop** completely (Quit and reopen)

2. **Check MCP server loaded**:
   - Look for "oci-logan" in Claude's available tools

3. **Test with query**:
   Ask Claude:
   ```
   "What log sources are available in my environment?"
   ```

4. **Expected result (v1.3.0+)**:
   - Shows 12+ active sources with log counts
   - Matches your OCI Console exactly
   - Lists all available log sources

5. **Old behavior (pre-v1.3.0)**:
   - Shows only 1-2 sources (incomplete)
   - Missing most log sources
   - **If you see this, rebuild**: `npm run build`

---

## Troubleshooting

### Installation Issues

#### Node.js/npm Errors

**Problem**: `npm install` fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node version
nvm use 18  # or nvm use 20
npm install
```

#### Python Virtual Environment Issues

**Problem**: `setup-python.sh` fails

**Solutions**:
```bash
# Ensure Python 3.8+ is installed
python3 --version

# Manually create venv
cd python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### TypeScript Build Errors

**Problem**: `npm run build` fails

**Solutions**:
```bash
# Clean and rebuild
rm -rf dist
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.x

# Install TypeScript explicitly
npm install typescript@latest --save-dev
npm run build
```

### Configuration Issues

#### Claude Desktop Not Loading MCP

**Problem**: MCP server doesn't appear in Claude

**Checklist**:
1. ✅ Used **absolute path** in config (not relative)
2. ✅ `dist/index.js` file exists
3. ✅ No syntax errors in `claude_desktop_config.json`
4. ✅ Restarted Claude Desktop completely
5. ✅ Check Claude Desktop logs: `~/Library/Logs/Claude/`

**Fix**:
```bash
# Verify config file syntax
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool

# Check file exists
ls -la /ABSOLUTE/PATH/TO/dist/index.js

# Rebuild
npm run build

# Restart Claude Desktop
```

#### OCI Authentication Errors

**Problem**: "Not authenticated" or "Missing credentials"

**Solutions**:
```bash
# Test OCI CLI
oci iam region list

# Check config file
cat ~/.oci/config

# Verify key file exists
ls -la ~/.oci/oci_api_key.pem

# Check permissions
chmod 600 ~/.oci/oci_api_key.pem

# Re-run setup
oci setup config
```

### Runtime Issues

#### Incomplete Log Source Results

**Problem**: Only showing 1-2 sources instead of 12+

**Cause**: Running version before v1.3.0

**Fix**:
```bash
cd /path/to/mcp-oci-logan-server
git pull  # If using git
npm run build
# Restart Claude Desktop
```

**Verify fix worked**:
Ask Claude: "What log sources are available?"
Should show ALL 12+ sources.

#### Query Errors

**Problem**: "Query syntax error" or "Missing input"

**Solutions**:
- Use natural language instead of writing queries
- Ask Claude to validate: `"Validate this query: ..."`
- Check documentation: `"Show me query syntax documentation"`

---

## Upgrade Guide

### Upgrading from Earlier Versions

**From any version to v1.3.0**:

```bash
cd /path/to/mcp-oci-logan-server

# Pull latest changes (if using git)
git pull

# Or manually download and extract

# Rebuild
npm install
npm run build

# Restart Claude Desktop
```

### Upgrading Python Environment

If Python packages need updating:

```bash
cd python
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### Upgrading Node Packages

```bash
npm update
npm run build
```

### Clean Reinstall

If you encounter issues:

```bash
# Backup your config
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/claude_config_backup.json

# Remove old installation
cd /path/to/mcp-oci-logan-server
rm -rf node_modules python/venv dist

# Fresh install
./install.sh

# Restore config if needed
```

---

## Quick Reference

### Installation Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./install.sh` | Complete automated installation | First-time setup |
| `./setup-python.sh` | Python environment only | Python issues |
| `./quick-start.sh` | Quick rebuild | After git pull |
| `npm run build` | TypeScript compilation | After code changes |

### Common Commands

```bash
# Full installation
./install.sh

# Quick rebuild
./quick-start.sh

# Test Python client
python python/logan_client.py --help

# Test OCI connection
oci iam region list

# Enable debug mode
# Edit Claude config: "LOGAN_DEBUG": "true"

# Check version
grep "Version" README.md | head -1
```

### File Locations

| File/Directory | Purpose |
|----------------|---------|
| `dist/` | Compiled JavaScript (gitignored) |
| `python/venv/` | Python virtual environment (gitignored) |
| `src/` | TypeScript source code |
| `python/*.py` | Python clients |
| `claude_desktop_config.json.template` | Config template |
| `~/Library/Application Support/Claude/` | Claude Desktop config |
| `~/.oci/config` | OCI CLI configuration |

---

## Support

If you need help:

1. **Check Documentation**:
   - `USER_GUIDE.md` - How to use the MCP
   - `README.md` - Complete project docs
   - `IMPROVEMENTS.md` - Recent changes
   - `CRITICAL_FIX_README.md` - v1.3.0 fix details

2. **Enable Debug Mode**:
   - Set `LOGAN_DEBUG: "true"` in Claude config
   - Check logs: `~/Library/Logs/Claude/`

3. **Test Basics**:
   ```
   "Check my OCI connection"
   "Show me namespace information"
   "What version of the MCP server am I using?"
   ```

4. **Run Diagnostics**:
   ```bash
   # Check prerequisites
   node --version && python3 --version && oci --version

   # Test Python
   python python/logan_client.py test

   # Test OCI
   oci iam region list
   ```

---

**Version**: 1.3.0
**Last Updated**: October 2025

**For complete documentation, see README.md and USER_GUIDE.md**
