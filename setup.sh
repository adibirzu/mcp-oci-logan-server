#!/bin/bash

# MCP OCI Logan Server Setup Script v1.2.0
# This script sets up the MCP OCI Logan Server for Claude Desktop integration
# Includes Python environment setup and dashboard management capabilities

set -e

echo "🚀 Setting up MCP OCI Logan Server v1.2.0..."
echo "   Features: Query execution, Dashboard management, Time correlation"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Setup Python environment
echo "🐍 Setting up Python environment..."
if [ -f "setup-python.sh" ]; then
    chmod +x setup-python.sh
    ./setup-python.sh
    echo "✅ Python environment setup complete"
else
    echo "⚠️  setup-python.sh not found - manual Python setup required"
    echo "   Create virtual environment: python3 -m venv python/venv"
    echo "   Install dependencies: pip install -r python/requirements.txt"
fi

# Check if OCI CLI is configured
if command -v oci &> /dev/null; then
    echo "✅ OCI CLI found"
    
    # Test OCI configuration
    if oci iam user get --user-id "$(oci iam user list --query 'data[0].id' --raw-output 2>/dev/null)" &> /dev/null; then
        echo "✅ OCI CLI is configured"
    else
        echo "⚠️  OCI CLI found but not configured"
        echo "   Run: oci setup config"
    fi
else
    echo "⚠️  OCI CLI not found"
    echo "   Install from: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
fi

# Check for Claude Desktop
CLAUDE_CONFIG_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CLAUDE_CONFIG_DIR="$HOME/.config/claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
fi

if [ -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "✅ Claude Desktop found"
    
    CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    
    # Backup existing config
    if [ -f "$CONFIG_FILE" ]; then
        cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        echo "📋 Backed up existing Claude Desktop config"
    fi
    
    # Create or update config
    echo "📝 Updating Claude Desktop configuration..."
    
    # Read the current config or create an empty one
    if [ -f "$CONFIG_FILE" ]; then
        CURRENT_CONFIG=$(cat "$CONFIG_FILE")
    else
        CURRENT_CONFIG="{}"
    fi
    
    # Add our MCP server configuration with environment variables
    # Read from .env file if it exists
    if [ -f ".env" ]; then
        source .env
    fi
    
    NEW_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg path "$(pwd)/dist/index.js" --arg compartment "${OCI_COMPARTMENT_ID:-}" --arg region "${OCI_REGION:-us-ashburn-1}" '
        .mcpServers = (.mcpServers // {}) | 
        .["oci-logan"] = {
            "command": "node",
            "args": [$path],
            "env": {
                "OCI_REGION": $region,
                "OCI_COMPARTMENT_ID": $compartment
            }
        }
    ')
    
    echo "$NEW_CONFIG" > "$CONFIG_FILE"
    echo "✅ Claude Desktop configuration updated"
    
else
    echo "⚠️  Claude Desktop not found"
    echo "   Install from: https://claude.ai/download"
    echo "   Manual config file location: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"
fi

# Test the server with multiple test suites
echo ""
echo "🧪 Testing server functionality..."
if [ -f "test-server.js" ]; then
    node test-server.js
else
    echo "⚠️  test-server.js not found - manual testing required"
fi

echo "🧪 Testing OCI connection..."
if [ -f "test-oci-direct.js" ]; then
    node test-oci-direct.js || echo "⚠️  OCI connection test failed - check authentication"
else
    echo "⚠️  test-oci-direct.js not found"
fi

echo "🧪 Testing time correlation..."
if [ -f "test-time-correlation.js" ]; then
    node test-time-correlation.js || echo "⚠️  Time correlation test failed"
else
    echo "⚠️  test-time-correlation.js not found"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure OCI authentication (if not already done):"
echo "   - Option A: Run 'oci setup config'"
echo "   - Option B: Set environment variables (OCI_USER_ID, OCI_TENANCY_ID, etc.)"
echo "   - Option C: Use Instance Principal (automatic on OCI Compute)"
echo ""
echo "2. Set your OCI compartment ID:"
echo "   Option A: Create .env file with OCI_COMPARTMENT_ID=your-compartment-id"
echo "   Option B: Export environment variable: export OCI_COMPARTMENT_ID=your-compartment-id"
echo "   Current: ${OCI_COMPARTMENT_ID:-'Not Set - Please configure!'}"
echo "   Config file: $CONFIG_FILE"
echo ""
echo "3. Restart Claude Desktop to load the new configuration"
echo ""
echo "4. Test the integration with these commands:"
echo "   'Check OCI connection status'"
echo "   'List dashboards in my compartment' "
echo "   'Execute a simple Logan query'"
echo ""
echo "🆕 New v1.2.0 Features Available:"
echo "   • Dashboard management (16 tools total)"
echo "   • Time correlation across logs"
echo "   • Saved search management"
echo "   • Enhanced MITRE ATT&CK analysis"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Overview and setup"
echo "   • USER_GUIDE.md - Comprehensive usage guide"
echo "   • TIME-CORRELATION-FIX.md - Time correlation details"
echo "🔧 Configuration: $CONFIG_FILE"
echo "🐍 Python Environment: python/venv/"
echo ""