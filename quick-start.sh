#!/bin/bash
# ==============================================================================
# MCP OCI Logan Server - Quick Start Script v1.3.0
# ==============================================================================
# Use this script if you already have prerequisites installed
# For first-time setup, use: ./install.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    MCP OCI Logan Server - Quick Start v1.3.0                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Quick checks
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "🚀 Quick build and start..."
echo ""

# Install/update dependencies
echo "📦 Installing Node dependencies..."
npm install --silent

# Setup Python if needed
if [ ! -d "python/venv" ]; then
    echo "🐍 Setting up Python environment..."
    ./setup-python.sh
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Start Node MCP server: npm run start (or node dist/index.js)"
echo "  2. Start FastMCP server (Python): source python/venv/bin/activate && python python/fastmcp_server.py"
echo "  3. Restart Claude Desktop and select the server to use"
echo "  4. Ask: \"What log sources are available?\""
echo ""
echo -e "${CYAN}💡 Tip: Run ./install.sh for full installation with configuration${NC}"
echo ""
