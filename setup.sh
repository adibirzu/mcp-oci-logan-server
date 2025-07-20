#!/bin/bash

# MCP OCI Logan Server Setup Script
# This script sets up the MCP OCI Logan Server for Claude Desktop integration

set -e

echo "🚀 Setting up MCP OCI Logan Server..."
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
    
    # Add our MCP server configuration
    NEW_CONFIG=$(echo "$CURRENT_CONFIG" | jq --arg path "$(pwd)/dist/index.js" '
        .mcpServers = (.mcpServers // {}) | 
        .["oci-logan"] = {
            "command": "node",
            "args": [$path],
            "env": {
                "OCI_REGION": "us-ashburn-1"
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

# Test the server
echo ""
echo "🧪 Testing server..."
npm run test

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure OCI authentication:"
echo "   - Option A: Run 'oci setup config'"
echo "   - Option B: Set environment variables (OCI_USER_ID, OCI_TENANCY_ID, etc.)"
echo "   - Option C: Use Instance Principal (automatic on OCI Compute)"
echo ""
echo "2. Set your OCI compartment ID:"
echo "   export OCI_COMPARTMENT_ID='ocid1.compartment.oc1..your-compartment-id'"
echo ""
echo "3. Restart Claude Desktop to load the new configuration"
echo ""
echo "4. Test the integration:"
echo "   'Check OCI connection and show available tools'"
echo ""
echo "📚 Documentation: README.md"
echo "🔧 Configuration: $CONFIG_FILE"
echo ""