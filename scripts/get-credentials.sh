#!/bin/bash

##
# Get Test Credentials Helper Script
#
# Usage:
#   ./scripts/get-credentials.sh              # Show all credentials
#   ./scripts/get-credentials.sh admin        # Show admin credentials only
#   ./scripts/get-credentials.sh login        # Get login curl command
#   ./scripts/get-credentials.sh token        # Login and get token
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDS_FILE="$SCRIPT_DIR/test-credentials.jsonc"
API_URL="${API_URL:-http://localhost:3001}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Install with: sudo apt install jq"
    exit 1
fi

# Read JSON file (now valid JSON, no comment stripping needed)
read_json() {
    cat "$CREDS_FILE"
}

show_all() {
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}       IoT Platform Test Credentials${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}\n"

    echo -e "${BLUE}🔐 Admin (SuperAdmin)${NC}"
    echo "   Username: $(read_json | jq -r '.admin.username')"
    echo "   Password: $(read_json | jq -r '.admin.password')"
    echo "   Email:    $(read_json | jq -r '.admin.email')"
    echo ""

    echo -e "${BLUE}👤 Operator${NC}"
    echo "   Username: $(read_json | jq -r '.operator.username')"
    echo "   Password: $(read_json | jq -r '.operator.password')"
    echo ""

    echo -e "${BLUE}👁️  Viewer${NC}"
    echo "   Username: $(read_json | jq -r '.viewer.username')"
    echo "   Password: $(read_json | jq -r '.viewer.password')"
    echo ""

    echo -e "${BLUE}🏢 Default Org ID${NC}"
    echo "   $(read_json | jq -r '.defaultOrgId')"
    echo ""

    echo -e "${YELLOW}📝 Swagger UI: ${NC}$API_URL/docs"
    echo -e "${YELLOW}📚 API Docs:   ${NC}$API_URL/docs/json"
    echo ""
}

show_user() {
    local user=$1
    echo -e "${BLUE}Credentials for: $user${NC}"
    echo "Username: $(read_json | jq -r ".$user.username")"
    echo "Password: $(read_json | jq -r ".$user.password")"
    echo "Email:    $(read_json | jq -r ".$user.email")"
    echo "Role:     $(read_json | jq -r ".$user.role")"
}

show_login_command() {
    local user=${1:-admin}
    local username=$(read_json | jq -r ".$user.username")
    local password=$(read_json | jq -r ".$user.password")

    echo -e "${GREEN}Login Command (curl):${NC}\n"
    cat <<EOF
curl -X POST $API_URL/auth/login \\
  -H "Content-Type: application/json" \\
  --data-raw '{"username":"$username","password":"$password"}' \\
  | jq
EOF
    echo ""
}

get_token() {
    local user=${1:-admin}
    local username=$(read_json | jq -r ".$user.username")
    local password=$(read_json | jq -r ".$user.password")

    echo -e "${BLUE}Logging in as $user...${NC}"

    local response=$(curl -s -X POST $API_URL/auth/login \
        -H "Content-Type: application/json" \
        --data-raw "{\"username\":\"$username\",\"password\":\"$password\"}")

    local success=$(echo "$response" | jq -r '.success')

    if [ "$success" = "true" ]; then
        local token=$(echo "$response" | jq -r '.data.accessToken')
        echo -e "${GREEN}✅ Login successful!${NC}\n"
        echo "Access Token:"
        echo "$token"
        echo ""
        echo -e "${YELLOW}Use with API calls:${NC}"
        echo "curl -X GET $API_URL/workflows -H \"Authorization: Bearer $token\" | jq"
    else
        echo -e "${YELLOW}❌ Login failed${NC}"
        echo "$response" | jq
    fi
}

# Main
case "${1:-all}" in
    all)
        show_all
        ;;
    admin|operator|viewer)
        show_user "$1"
        ;;
    login)
        show_login_command "${2:-admin}"
        ;;
    token)
        get_token "${2:-admin}"
        ;;
    help|-h|--help)
        echo "Usage: $0 [command] [user]"
        echo ""
        echo "Commands:"
        echo "  all              Show all credentials (default)"
        echo "  admin            Show admin credentials only"
        echo "  operator         Show operator credentials only"
        echo "  viewer           Show viewer credentials only"
        echo "  login [user]     Show login curl command for user (default: admin)"
        echo "  token [user]     Login and get access token (default: admin)"
        echo "  help             Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Show all credentials"
        echo "  $0 admin              # Show admin credentials"
        echo "  $0 login operator     # Show login command for operator"
        echo "  $0 token              # Login as admin and get token"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
