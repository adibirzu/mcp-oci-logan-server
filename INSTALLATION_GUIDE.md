# OCI MCP Logan Server - Installation Guide v1.2.0

## Overview

This guide walks you through installing and configuring the OCI MCP Logan Server v1.2.0, which provides 16 tools for OCI Logging Analytics integration with Claude Desktop, including dashboard management, time correlation, and security analysis capabilities.

## Prerequisites

### System Requirements
- **Operating System**: macOS, Linux, or Windows (with WSL)
- **Node.js**: Version 18 or higher
- **Python**: Version 3.8 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Disk Space**: ~500MB for dependencies

### Oracle Cloud Infrastructure (OCI) Requirements
- **OCI Account**: Active OCI tenancy with appropriate permissions
- **Logging Analytics**: Enabled in your OCI tenancy
- **Compartment Access**: Read/write permissions to target compartments
- **API Key**: Generated API key pair for authentication

### Software Requirements
- **OCI CLI**: Latest version installed and configured
- **Claude Desktop**: Latest version from claude.ai
- **jq**: JSON processor (for configuration scripts)

## Quick Installation

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server

# 2. Run automated setup
./setup.sh

# 3. Follow the on-screen instructions
```

### Option 2: Manual Step-by-Step

```bash
# 1. Clone and build
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server
npm install
npm run build

# 2. Setup Python environment
./setup-python.sh

# 3. Configure Claude Desktop
cp claude_desktop_config.json.template claude_desktop_config.json
# Edit the config file with your paths

# 4. Test installation
node test-server.js
```

## Detailed Installation Steps

### Step 1: System Prerequisites

#### Install Node.js 18+
```bash
# macOS (using Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0 or higher
```

#### Install Python 3.8+
```bash
# macOS
brew install python

# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Verify installation
python3 --version  # Should be 3.8.0 or higher
```

#### Install OCI CLI
```bash
# macOS/Linux
bash -c \"$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\"

# Verify installation
oci --version
```

#### Install jq (JSON processor)
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Verify installation
jq --version
```

### Step 2: Clone and Build Project

```bash
# Clone repository
git clone https://github.com/adibirzu/mcp-oci-logan-server.git
cd mcp-oci-logan-server

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build

# Verify build
ls -la dist/  # Should contain index.js and other compiled files
```

### Step 3: Python Environment Setup

```bash
# Run Python setup script
./setup-python.sh

# Manual setup (if script fails)
cd python
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

**Verify Python Setup:**
```bash
cd python
source venv/bin/activate
python logan_client.py --help
python dashboard_client.py --help
deactivate
cd ..
```

### Step 4: OCI Authentication Configuration

#### Option A: OCI CLI Configuration (Recommended)
```bash
# Run OCI setup
oci setup config

# Follow prompts to enter:
# - User OCID
# - Tenancy OCID  
# - Region
# - Private key path
# - Passphrase (if applicable)

# Test configuration
oci iam user get --user-id $(oci iam user list --query 'data[0].id' --raw-output)
```

#### Option B: Environment Variables
```bash
# Set environment variables
export OCI_USER_ID=\"ocid1.user.oc1..aaaaaaaa[your-user-id]\"
export OCI_FINGERPRINT=\"aa:bb:cc:dd:ee:ff:11:22:33:44:55:66:77:88:99:00\"
export OCI_TENANCY_ID=\"ocid1.tenancy.oc1..aaaaaaaa[your-tenancy-id]\"
export OCI_REGION=\"eu-frankfurt-1\"
export OCI_KEY_FILE=\"/path/to/private/key.pem\"
export OCI_COMPARTMENT_ID=\"ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]\"

# Add to your shell profile for persistence
echo 'export OCI_COMPARTMENT_ID=\"ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]\"' >> ~/.bashrc
```

#### Option C: Instance Principal (OCI Compute only)
No configuration needed - automatically detected when running on OCI compute instances with proper IAM policies.

### Step 5: Claude Desktop Configuration

#### Copy Configuration Template
```bash
cp claude_desktop_config.json.template claude_desktop_config.json
```

#### Edit Configuration File
```bash
# Edit the config file
nano claude_desktop_config.json
```

**Update these values:**
```json
{
  \"mcpServers\": {
    \"oci-logan\": {
      \"command\": \"node\",
      \"args\": [\"/FULL/PATH/TO/mcp-oci-logan-server/dist/index.js\"],
      \"env\": {
        \"OCI_COMPARTMENT_ID\": \"ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]\",
        \"OCI_REGION\": \"YOUR_REGION\"
      }
    }
  }
}
```

#### Install Configuration
```bash
# macOS
cp claude_desktop_config.json \"$HOME/Library/Application Support/Claude/claude_desktop_config.json\"

# Linux
mkdir -p \"$HOME/.config/claude\"
cp claude_desktop_config.json \"$HOME/.config/claude/claude_desktop_config.json\"

# Windows (WSL)
mkdir -p \"$APPDATA/Claude\"
cp claude_desktop_config.json \"$APPDATA/Claude/claude_desktop_config.json\"
```

### Step 6: Testing Installation

#### Test Server Functionality
```bash
# Test basic server functionality
node test-server.js

# Expected output:
# ✅ MCP Server test passed
# ✅ All 16 tools available
```

#### Test OCI Connection
```bash
# Test OCI connectivity
node test-oci-direct.js

# Expected output:
# ✅ OCI authentication successful
# ✅ Log Analytics client initialized
# ✅ Compartment access verified
```

#### Test Time Correlation  
```bash
# Test time correlation features
node test-time-correlation.js

# Expected output:
# ✅ Time parsing correct
# ✅ Time correlation working
```

#### Test Dashboard Management
```bash
# Test dashboard functionality
node test-dashboard-export.js

# Expected output:
# ✅ Dashboard client functional
# ✅ Export/import working
```

### Step 7: Claude Desktop Integration

#### Restart Claude Desktop
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. Wait for MCP server initialization (30-60 seconds)

#### Verify Integration
In Claude Desktop, try these commands:

```
Check OCI connection status
```
Expected response: Connection details and authentication status

```
List available tools
```
Expected response: 16 tools including dashboard management

```
List dashboards in my compartment
```
Expected response: Available dashboards (or compartment selection prompt)

## Configuration Reference

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OCI_COMPARTMENT_ID` | Default compartment OCID | Yes | None |
| `OCI_REGION` | OCI region identifier | No | us-ashburn-1 |
| `OCI_USER_ID` | User OCID | No | From config file |
| `OCI_TENANCY_ID` | Tenancy OCID | No | From config file |
| `OCI_FINGERPRINT` | API key fingerprint | No | From config file |
| `OCI_KEY_FILE` | Private key file path | No | From config file |
| `OCI_NAMESPACE` | Object storage namespace | No | Auto-detected |

### Directory Structure

```
mcp-oci-logan-server/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Main MCP server (16 tools)
│   ├── oci/LogAnalyticsClient.ts # OCI integration
│   └── utils/                    # Utility modules
├── python/                       # Python backend
│   ├── venv/                     # Virtual environment (created by setup)
│   ├── logan_client.py           # Query execution client
│   ├── dashboard_client.py       # Dashboard management
│   ├── security_analyzer.py      # Security analysis
│   └── requirements.txt          # Python dependencies
├── dist/                         # Compiled JavaScript (created by build)
├── test-*.js                     # Test scripts
├── setup.sh                      # Main setup script
├── setup-python.sh               # Python environment setup
├── claude_desktop_config.json    # Your Claude Desktop config
└── claude_desktop_config.json.template # Configuration template
```

### File Permissions

Ensure proper permissions for key files:
```bash
# Make scripts executable
chmod +x setup.sh
chmod +x setup-python.sh

# Secure private key
chmod 600 ~/.oci/oci_api_key.pem

# Verify permissions
ls -la ~/.oci/
ls -la setup*.sh
```

## Troubleshooting

### Common Installation Issues

#### Node.js Version Error
```
Error: Node.js 18 or higher is required
Solution: Update Node.js using your package manager
```

#### Python Version Error  
```
Error: Python 3.8+ is required
Solution: Install Python 3.8+ or use pyenv to manage versions
```

#### Permission Denied Errors
```
Error: Permission denied
Solution: 
1. Check file permissions: ls -la
2. Make scripts executable: chmod +x setup.sh
3. Check directory ownership
```

#### OCI CLI Configuration Issues
```
Error: OCI CLI not configured
Solution:
1. Run: oci setup config
2. Verify: oci iam user list
3. Check ~/.oci/config file
```

#### Virtual Environment Issues
```
Error: Virtual environment creation failed
Solution:
1. Install python3-venv: sudo apt install python3-venv
2. Clear existing venv: rm -rf python/venv
3. Re-run: ./setup-python.sh
```

### Testing and Verification

After installation, run these verification commands:

```bash
# 1. Verify Node.js build
node -e \"console.log('Node.js OK')\"
ls -la dist/index.js

# 2. Verify Python environment  
cd python && source venv/bin/activate && python --version && deactivate && cd ..

# 3. Verify OCI configuration
oci iam user list --query 'data[0].name' --raw-output

# 4. Verify Claude Desktop config
cat \"$HOME/Library/Application Support/Claude/claude_desktop_config.json\" | jq .

# 5. Test MCP server
node test-server.js
```

### Getting Help

If you encounter issues:

1. **Check Prerequisites**: Ensure all system requirements are met
2. **Review Logs**: Check debug logs in `/tmp/mcp-*.log`
3. **Test Components**: Run individual test scripts
4. **Verify Configuration**: Check OCI CLI and Claude Desktop configs
5. **Documentation**: Refer to USER_GUIDE.md for detailed usage

### Performance Optimization

After installation, consider these optimizations:

1. **Memory Settings**: Increase Node.js heap size for large queries
2. **Connection Pooling**: Configure OCI client connection pooling  
3. **Cache Configuration**: Enable query result caching
4. **Log Rotation**: Set up log rotation for debug files

## Post-Installation

### Next Steps

1. **Read Documentation**:
   - `USER_GUIDE.md` - Comprehensive usage guide
   - `TIME-CORRELATION-FIX.md` - Time correlation details
   - `README.md` - Project overview

2. **Explore Features**:
   - Try dashboard management tools
   - Test MITRE ATT&CK analysis
   - Experiment with security event search

3. **Configure Monitoring**:
   - Set up regular connection tests
   - Monitor query performance
   - Review debug logs periodically

### Maintenance

- **Updates**: Pull latest changes regularly
- **Dependencies**: Update Node.js and Python packages
- **Configuration**: Review and update OCI settings
- **Testing**: Run test suites after updates

---

**Installation Guide Version**: 1.2.0  
**Last Updated**: July 2025  
**Supported Versions**: OCI MCP Logan Server v1.2.0+