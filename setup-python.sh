#!/bin/bash
set -e  # Exit on any error

# Setup script for MCP OCI Logan Server Python dependencies v1.2.0
# Includes support for query execution, dashboard management, and security analysis

echo "Setting up Python environment for MCP OCI Logan Server v1.2.0..."
echo "Features: Logan client, Dashboard client, Security analyzer"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo "❌ Error: Python 3.8+ is required. Current version: $(python3 --version)"
    exit 1
fi

echo "✅ Python version check passed: $(python3 --version)"

# Ensure we're in the right directory
if [ ! -d "python" ]; then
    echo "❌ Error: python directory not found. Run this script from the project root."
    exit 1
fi

# Change to python directory
cd python

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created: python/venv/"
else
    echo "✅ Virtual environment already exists: python/venv/"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated"

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip --quiet
echo "✅ Pip upgraded to latest version"

# Install requirements
echo "📦 Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Error: requirements.txt not found in python directory"
    exit 1
fi

echo "🎉 Python environment setup complete!"
echo ""
echo "📋 Available Python clients:"
echo "  • logan_client.py - Main query execution client"
echo "  • dashboard_client.py - Dashboard management client"
echo "  • security_analyzer.py - Security event analysis"
echo "  • query_mapper.py - Query mapping utilities"
echo "  • query_validator.py - Query validation"
echo ""
echo "🧪 To test the Python clients:"
echo "  cd python"
echo "  source venv/bin/activate"
echo "  python logan_client.py --help"
echo "  python dashboard_client.py --help"
echo ""
echo "📋 Prerequisites checklist:"
echo "  ✅ Python 3.8+ installed: $(python3 --version)"
echo "  ✅ Virtual environment created: python/venv/"
echo "  ✅ Dependencies installed"
echo "  ⏳ OCI configuration: Make sure ~/.oci/config is set up"
echo ""
echo "🔧 Next steps:"
echo "  1. Configure OCI CLI: oci setup config"
echo "  2. Test connection: python logan_client.py test"
echo "  3. Run main setup: ./setup.sh"
echo ""
echo "📁 Virtual environment location: python/venv/ (excluded from git)"