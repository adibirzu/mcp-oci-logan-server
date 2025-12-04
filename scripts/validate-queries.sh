#!/bin/bash
#
# Query Validation Script
# Tests predefined queries against OCI Logging Analytics
#
# Usage:
#   ./scripts/validate-queries.sh [options]
#
# Options:
#   --dry-run           Show queries without executing
#   --category <id>     Test specific category (vcn_flow, oci_audit, database, etc.)
#   --query <id>        Test specific query by ID
#   --output <file>     Save results to JSON file
#   --help              Show this help message
#
# Prerequisites:
#   - OCI_COMPARTMENT_ID environment variable must be set
#   - Python venv with OCI SDK installed (run ./setup-python.sh first)
#   - Valid OCI config at ~/.oci/config
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    head -30 "$0" | tail -25 | sed 's/^# *//'
    echo ""
    echo "Available categories:"
    echo "  vcn_flow       - VCN Flow Logs analysis"
    echo "  oci_audit      - OCI Audit logs"
    echo "  database       - Oracle Database logs"
    echo "  api_gateway    - API Gateway access logs"
    echo "  object_storage - Object Storage logs"
    echo "  security       - Security/Cloud Guard"
    echo "  compute        - Compute instance logs"
    echo "  load_balancer  - Load Balancer logs"
}

# Parse arguments
DRY_RUN=""
CATEGORY=""
QUERY_ID=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --category)
            CATEGORY="--category $2"
            shift 2
            ;;
        --query)
            QUERY_ID="--query $2"
            shift 2
            ;;
        --output)
            OUTPUT="--output $2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Check prerequisites
if [[ -z "$OCI_COMPARTMENT_ID" && -z "$DRY_RUN" ]]; then
    echo -e "${RED}Error: OCI_COMPARTMENT_ID environment variable is required${NC}"
    echo ""
    echo "Set it with:"
    echo "  export OCI_COMPARTMENT_ID=\"ocid1.compartment.oc1..xxx\""
    echo ""
    echo "Or run with --dry-run to see queries without executing"
    exit 1
fi

# Check Python venv
VENV_DIR="$PROJECT_DIR/python/venv"
if [[ ! -d "$VENV_DIR" ]]; then
    echo -e "${YELLOW}Warning: Python venv not found at $VENV_DIR${NC}"
    echo "Run ./setup-python.sh first to set up the Python environment"
    if [[ -z "$DRY_RUN" ]]; then
        exit 1
    fi
fi

# Check if we need to build TypeScript
if [[ ! -f "$PROJECT_DIR/dist/queries/predefined-queries.js" ]]; then
    echo -e "${BLUE}Building TypeScript...${NC}"
    cd "$PROJECT_DIR" && npm run build
fi

# Run validation
echo -e "${BLUE}Running query validation...${NC}"
echo ""

cd "$PROJECT_DIR"

# Use tsx to run TypeScript directly
npx tsx scripts/validate-queries.ts $DRY_RUN $CATEGORY $QUERY_ID $OUTPUT

exit_code=$?

if [[ $exit_code -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}All queries validated successfully!${NC}"
else
    echo ""
    echo -e "${RED}Some queries failed validation. Review the output above.${NC}"
fi

exit $exit_code
