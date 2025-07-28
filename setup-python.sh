#!/bin/bash

# Setup script for MCP OCI Logan Server Python dependencies

echo "Setting up Python environment for MCP OCI Logan Server..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Change to python directory
cd python

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Python environment setup complete!"
echo ""
echo "To test the Python client:"
echo "  cd python"
echo "  source venv/bin/activate"
echo "  python logan_client.py test"
echo ""
echo "Make sure your OCI configuration is set up in ~/.oci/config"