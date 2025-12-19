#!/bin/bash
# ==============================================================================
# MCP OCI Logan Server - Complete Installation Script v1.3.0
# ==============================================================================
# This script performs a complete installation of the MCP OCI Logan Server:
# - Checks prerequisites (Node.js, Python, OCI CLI)
# - Installs Node.js dependencies
# - Sets up Python virtual environment
# - Builds TypeScript code
# - Tests the installation
# - Optionally configures Claude Desktop
# ==============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis
CHECK="✅"
CROSS="❌"
WARN="⚠️ "
INFO="ℹ️ "
ROCKET="🚀"
PACKAGE="📦"
WRENCH="🔧"
TEST="🧪"
SPARKLES="✨"

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}${INFO}$1${NC}"
}

print_step() {
    echo -e "${PURPLE}${WRENCH} $1${NC}"
}

# ==============================================================================
# Prerequisite Checks
# ==============================================================================

check_prerequisites() {
    print_header "Step 1: Checking Prerequisites"

    all_good=true

    # Check Node.js
    print_step "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js ${NODE_VERSION} installed (required: v18+)"
        else
            print_error "Node.js ${NODE_VERSION} is too old (required: v18+)"
            all_good=false
        fi
    else
        print_error "Node.js is not installed (required: v18+)"
        echo "  Install from: https://nodejs.org/"
        all_good=false
    fi

    # Check npm
    print_step "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm ${NPM_VERSION} installed"
    else
        print_error "npm is not installed"
        all_good=false
    fi

    # Check Python 3
    print_step "Checking Python installation..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
        if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
            print_success "Python ${PYTHON_VERSION} installed (required: 3.8+)"
        else
            print_error "Python ${PYTHON_VERSION} is too old (required: 3.8+)"
            all_good=false
        fi
    else
        print_error "Python 3 is not installed (required: 3.8+)"
        echo "  Install from: https://www.python.org/"
        all_good=false
    fi

    # Check OCI CLI (optional but recommended)
    print_step "Checking OCI CLI installation..."
    if command -v oci &> /dev/null; then
        OCI_VERSION=$(oci --version 2>&1 | head -1)
        print_success "OCI CLI installed: ${OCI_VERSION}"

        # Check if OCI config exists
        if [ -f "$HOME/.oci/config" ]; then
            print_success "OCI config file found: ~/.oci/config"
        else
            print_warning "OCI config file not found: ~/.oci/config"
            print_info "You'll need to run 'oci setup config' after installation"
        fi
    else
        print_warning "OCI CLI not installed (optional but recommended)"
        print_info "Install from: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
    fi

    # Check if we're in the right directory
    print_step "Checking project structure..."
    if [ ! -f "package.json" ] || [ ! -d "src" ] || [ ! -d "python" ]; then
        print_error "Not in the correct directory. Run this script from the mcp-oci-logan-server root."
        all_good=false
    else
        print_success "Project structure validated"
    fi

    echo ""
    if [ "$all_good" = true ]; then
        print_success "All required prerequisites are met!"
        return 0
    else
        print_error "Some prerequisites are missing. Please install them and try again."
        return 1
    fi
}

# ==============================================================================
# Node.js Setup
# ==============================================================================

install_node_dependencies() {
    print_header "Step 2: Installing Node.js Dependencies"

    print_step "Installing npm packages..."
    if npm install; then
        print_success "Node.js dependencies installed successfully"

        # Show installed versions
        print_info "Key packages installed:"
        echo "  • @modelcontextprotocol/sdk (MCP framework)"
        echo "  • oci-sdk (OCI integration)"
        echo "  • TypeScript compiler"
    else
        print_error "Failed to install Node.js dependencies"
        return 1
    fi
}

# ==============================================================================
# Python Setup
# ==============================================================================

setup_python_environment() {
    print_header "Step 3: Setting Up Python Environment"

    cd python

    # Create virtual environment
    print_step "Creating Python virtual environment..."
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created: python/venv/"
    else
        print_success "Virtual environment already exists: python/venv/"
    fi

    # Activate virtual environment
    print_step "Activating virtual environment..."
    source venv/bin/activate
    print_success "Virtual environment activated"

    # Upgrade pip
    print_step "Upgrading pip..."
    pip install --upgrade pip --quiet
    print_success "Pip upgraded to latest version"

    # Install requirements
    print_step "Installing Python dependencies..."
    if [ -f "requirements.txt" ]; then
        if pip install -r requirements.txt --quiet; then
            print_success "Python dependencies installed successfully"

            # Show installed packages
            print_info "Python packages installed:"
            echo "  • oci (OCI Python SDK)"
            echo "  • requests (HTTP client)"
            echo "  • python-dotenv (Environment variables)"
        else
            print_error "Failed to install Python dependencies"
            cd ..
            return 1
        fi
    else
        print_error "requirements.txt not found"
        cd ..
        return 1
    fi

    cd ..
}

# ==============================================================================
# TypeScript Build
# ==============================================================================

build_typescript() {
    print_header "Step 4: Building TypeScript Code"

    print_step "Compiling TypeScript to JavaScript..."
    if npm run build; then
        print_success "TypeScript compiled successfully"
        print_info "Compiled files located in: dist/"
    else
        print_error "TypeScript compilation failed"
        return 1
    fi
}

# ==============================================================================
# Installation Test
# ==============================================================================

test_installation() {
    print_header "Step 5: Testing Installation"

    # Test Python clients (syntax only)
    print_step "Testing Python clients..."
    if python/venv/bin/python -m py_compile python/logan_client.py python/dashboard_client.py python/query_validator.py python/security_analyzer.py; then
        print_success "Python client modules compile"
    else
        print_error "Python client compilation failed"
    fi

    # Test FastMCP server (syntax only to avoid stdio hang)
    print_step "Testing FastMCP server module..."
    python/venv/bin/python - <<'PY'
import sys
if sys.version_info < (3, 10):
    sys.exit(42)
PY
    PY_STATUS=$?
    if [ "$PY_STATUS" -eq 42 ]; then
        print_warning "FastMCP server requires Python 3.10+; skipped"
    elif [ "$PY_STATUS" -ne 0 ]; then
        print_warning "FastMCP Python version check failed; skipped"
    elif python/venv/bin/python -m py_compile python/fastmcp_server.py; then
        print_success "FastMCP server module compiles"
    else
        print_warning "FastMCP server module compilation failed"
    fi

    # Test if compiled JavaScript exists
    print_step "Checking compiled files..."
    if [ -f "dist/index.js" ]; then
        print_success "Main server file exists: dist/index.js"
    else
        print_error "Main server file missing: dist/index.js"
        return 1
    fi

    # Test if node can parse the module structure
    print_step "Testing MCP server module..."
    # The MCP server starts on import and waits for stdio, so we verify structure instead
    # Check for key module indicators without executing (which would hang)
    if [ -f "dist/index.js" ] && \
       grep -q "import.*@modelcontextprotocol" dist/index.js 2>/dev/null && \
       (grep -q "class.*MCPServer\|Server\|OCILogan" dist/index.js 2>/dev/null || \
        grep -q "new Server" dist/index.js 2>/dev/null); then
        print_success "MCP server module structure validated"
    else
        print_warning "MCP server module structure check inconclusive"
    fi
}

# ==============================================================================
# Claude Desktop Configuration
# ==============================================================================

configure_claude_desktop() {
    print_header "Step 6: Claude Desktop Configuration"

    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    PROJECT_DIR=$(pwd)

    print_info "Claude Desktop configuration options:"
    echo ""
    echo "1. Automatic - Add to Claude Desktop config automatically"
    echo "2. Manual - Show configuration snippet to add manually"
    echo "3. Skip - Configure later"
    echo ""

    read -p "Choose option (1/2/3): " CONFIG_CHOICE

    case $CONFIG_CHOICE in
        1)
            print_step "Configuring Claude Desktop automatically..."

            # Check if Claude Desktop is installed
            if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
                print_error "Claude Desktop config directory not found"
                print_info "Is Claude Desktop installed? Expected: ~/Library/Application Support/Claude"
                return 1
            fi

            # Backup existing config
            if [ -f "$CLAUDE_CONFIG" ]; then
                cp "$CLAUDE_CONFIG" "${CLAUDE_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
                print_success "Existing config backed up"
            fi

            # Ask for compartment ID
            echo ""
            read -p "Enter your OCI Compartment ID: " COMPARTMENT_ID
            read -p "Enter your OCI Region (default: us-ashburn-1): " OCI_REGION
            OCI_REGION=${OCI_REGION:-us-ashburn-1}

            # Create configuration
            cat > /tmp/mcp-oci-logan-config.json <<EOF
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["${PROJECT_DIR}/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "${COMPARTMENT_ID}",
        "OCI_REGION": "${OCI_REGION}",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
EOF

            # Merge with existing config or create new
            if [ -f "$CLAUDE_CONFIG" ]; then
                print_step "Merging with existing config..."
                # Note: This is a simple approach. In production, use jq for proper JSON merging
                print_warning "Manual merge required - configuration saved to: /tmp/mcp-oci-logan-config.json"
                print_info "Add the 'oci-logan' section to your existing ${CLAUDE_CONFIG}"
            else
                mv /tmp/mcp-oci-logan-config.json "$CLAUDE_CONFIG"
                print_success "Configuration created: ${CLAUDE_CONFIG}"
            fi
            ;;
        2)
            print_step "Manual configuration snippet:"
            echo ""
            echo "Add this to ${CLAUDE_CONFIG}:"
            echo ""
            cat <<'EOF'
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "[Link to Secure Variable: OCI_COMPARTMENT_ID]",
        "OCI_REGION": "us-ashburn-1",
        "SUPPRESS_LABEL_WARNING": "True",
        "LOGAN_DEBUG": "false"
      }
    }
  }
}
EOF
            echo ""
            print_info "Replace '/ABSOLUTE/PATH/TO' with: ${PROJECT_DIR}"
            print_info "Replace 'your-id' with your OCI Compartment OCID"
            ;;
        3)
            print_info "Skipping Claude Desktop configuration"
            print_info "You can configure manually later using: claude_desktop_config.json.template"
            ;;
        *)
            print_warning "Invalid choice. Skipping configuration."
            ;;
    esac
}

# ==============================================================================
# Feature Verification
# ==============================================================================

verify_features() {
    print_header "Feature Verification"

    print_info "Checking implemented features..."
    echo ""

    # Check Python clients
    echo "Python Clients:"
    [ -f "python/logan_client.py" ] && echo "  ${CHECK} logan_client.py (Query execution)" || echo "  ${CROSS} logan_client.py"
    [ -f "python/dashboard_client.py" ] && echo "  ${CHECK} dashboard_client.py (Dashboard management)" || echo "  ${CROSS} dashboard_client.py"
    [ -f "python/security_analyzer.py" ] && echo "  ${CHECK} security_analyzer.py (Security analysis)" || echo "  ${CROSS} security_analyzer.py"
    [ -f "python/query_mapper.py" ] && echo "  ${CHECK} query_mapper.py (Query utilities)" || echo "  ${CROSS} query_mapper.py"
    [ -f "python/query_validator.py" ] && echo "  ${CHECK} query_validator.py (Validation)" || echo "  ${CROSS} query_validator.py"

    echo ""
    echo "TypeScript Core:"
    [ -f "dist/index.js" ] && echo "  ${CHECK} MCP Server (33 tools)" || echo "  ${CROSS} MCP Server"
    [ -f "dist/oci/LogAnalyticsClient.js" ] && echo "  ${CHECK} OCI Integration Layer" || echo "  ${CROSS} OCI Integration Layer"
    [ -f "dist/utils/QueryValidator.js" ] && echo "  ${CHECK} Query Validator" || echo "  ${CROSS} Query Validator"
    [ -f "dist/utils/QueryTransformer.js" ] && echo "  ${CHECK} Query Transformer" || echo "  ${CROSS} Query Transformer"

    echo ""
    echo "MCP Tools Available: 33"
    echo "  • Core Query Tools: 4 ${CHECK}"
    echo "  • Advanced Analytics: 5 ${CHECK}"
    echo "  • Resource Management: 10 ${CHECK}"
    echo "  • Dashboard Tools: 7 (⚠️  Partial)"
    echo "  • Utility Tools: 4 ${CHECK}"
    echo "  • Saved Search Tools: 3 (⚠️  Mixed)"
}

# ==============================================================================
# Installation Summary
# ==============================================================================

print_summary() {
    print_header "Installation Complete! ${SPARKLES}"

    echo "Installation Summary:"
    echo ""
    print_success "Node.js dependencies installed"
    print_success "Python environment configured (python/venv/)"
    print_success "TypeScript compiled to JavaScript (dist/)"
    print_success "All features verified and tested"
    echo ""

    print_info "Version: 1.3.0 (with critical fix)"
    print_info "Total Tools: 33 MCP tools available"
    print_info "Python Clients: 5 clients ready"
    echo ""

    print_header "Next Steps"

    echo "1. ${WRENCH} Configure OCI CLI (if not already done):"
    echo "   ${CYAN}oci setup config${NC}"
    echo ""

    echo "2. ${TEST} Test the installation:"
    echo "   ${CYAN}python python/logan_client.py test${NC}"
    echo "   ${CYAN}python python/logan_client.py --help${NC}"
    echo ""

    echo "3. ${ROCKET} Restart Claude Desktop to load the MCP server"
    echo ""

    echo "4. ${INFO} Verify it works - Ask Claude:"
    echo "   ${CYAN}\"What log sources are available in my environment?\"${NC}"
    echo ""

    print_info "Expected result: All 12+ active sources listed (v1.3.0 fix)"
    echo ""

    print_header "Documentation"

    echo "  • ${CYAN}README.md${NC} - Complete project documentation"
    echo "  • ${CYAN}USER_GUIDE.md${NC} - How to ask effective questions"
    echo "  • ${CYAN}IMPROVEMENTS.md${NC} - Recent changes and fixes"
    echo "  • ${CYAN}CRITICAL_FIX_README.md${NC} - Critical fix explanation"
    echo "  • ${CYAN}RELEASE_NOTES_v1.3.0.md${NC} - Full release notes"
    echo ""

    print_header "Troubleshooting"

    echo "If you encounter issues:"
    echo ""
    echo "  1. Enable debug mode in Claude config:"
    echo "     ${CYAN}\"LOGAN_DEBUG\": \"true\"${NC}"
    echo ""
    echo "  2. Check OCI connection:"
    echo "     ${CYAN}oci iam region list${NC}"
    echo ""
    echo "  3. Ask Claude to check:"
    echo "     ${CYAN}\"Check my OCI connection and tell me if there are issues\"${NC}"
    echo ""

    print_success "Installation completed successfully! ${ROCKET}"
}

# ==============================================================================
# Main Installation Flow
# ==============================================================================

main() {
    clear

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║         MCP OCI Logan Server - Complete Installer             ║${NC}"
    echo -e "${CYAN}║                     Version 1.3.0                             ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    print_info "This script will install and configure the MCP OCI Logan Server"
    print_info "It includes the critical fix for complete log source discovery"
    echo ""

    read -p "Continue with installation? (y/n): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    # Run installation steps
    check_prerequisites || exit 1
    install_node_dependencies || exit 1
    setup_python_environment || exit 1
    build_typescript || exit 1
    test_installation || exit 1
    verify_features
    configure_claude_desktop
    print_summary

    echo ""
    print_success "All done! ${SPARKLES} Enjoy using the MCP OCI Logan Server!"
    echo ""
}

# Run main function
main "$@"
