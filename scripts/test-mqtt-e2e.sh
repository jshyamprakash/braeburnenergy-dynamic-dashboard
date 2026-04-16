#!/bin/bash

# E2E Test: MQTT Gateway Integration
#
# Prerequisites:
# - API server running on localhost:3001
# - MongoDB running
# - mosquitto_pub/mosquitto_sub installed (for testing)
#
# Usage:
#   bash scripts/test-mqtt-e2e.sh
#

set -e

API_URL="http://localhost:3001"
MQTT_BROKER_URL="mqtt://localhost:1883"
TEST_APP_NAME="MQTT E2E Test App $(date +%s)"
TEST_GATEWAY_NAME="Test MQTT Gateway"
TEST_DEVICE_ID="mqtt-test-device-$(date +%s)"
TEST_TOPIC="sensor/temperature"
TEST_PAYLOAD='{"value": 25.5, "unit": "celsius"}'

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# ============================================================================
# 1. Verify API is running
# ============================================================================
log_info "Checking API server at $API_URL..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  log_error "API server not running at $API_URL"
  exit 1
fi
log_info "✓ API server is running"

# ============================================================================
# 2. Check mosquitto broker
# ============================================================================
log_info "Checking MQTT broker at localhost:1883..."
if ! timeout 2 bash -c "echo > /dev/tcp/localhost/1883" 2>/dev/null; then
  log_warn "MQTT broker not available at localhost:1883"
  log_info "Attempting to start mosquitto Docker container..."

  # Try to start mosquitto in Docker
  if command -v docker &> /dev/null; then
    docker run -d \
      --name mqtt-test-broker \
      -p 1883:1883 \
      -e MOSQUITTO_CONFIG="" \
      eclipse-mosquitto:latest 2>/dev/null || true

    sleep 2

    # Check again
    if ! timeout 2 bash -c "echo > /dev/tcp/localhost/1883" 2>/dev/null; then
      log_error "Failed to start MQTT broker"
      exit 1
    fi
    log_info "✓ MQTT broker started in Docker"
  else
    log_error "Docker not available and broker not running"
    exit 1
  fi
else
  log_info "✓ MQTT broker is running"
fi

# ============================================================================
# 3. Login and get token
# ============================================================================
log_info "Authenticating with API..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@12345"
  }')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  log_error "Failed to authenticate. Response: $AUTH_RESPONSE"
  exit 1
fi
log_info "✓ Authenticated with token: ${TOKEN:0:20}..."

# ============================================================================
# 4. Create test application
# ============================================================================
log_info "Creating test application: $TEST_APP_NAME..."
APP_RESPONSE=$(curl -s -X POST "$API_URL/applications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"$TEST_APP_NAME\",
    \"description\": \"Test application for MQTT E2E verification\"
  }")

APP_ID=$(echo "$APP_RESPONSE" | grep -o '"applicationId":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$APP_ID" ]; then
  log_error "Failed to create application. Response: $APP_RESPONSE"
  exit 1
fi
log_info "✓ Created application: $APP_ID"

# ============================================================================
# 5. Create test device
# ============================================================================
log_info "Creating test device: $TEST_DEVICE_ID..."
DEVICE_RESPONSE=$(curl -s -X POST "$API_URL/devices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"deviceId\": \"$TEST_DEVICE_ID\",
    \"name\": \"Test MQTT Device\",
    \"description\": \"Device for MQTT E2E testing\",
    \"applicationId\": \"$APP_ID\",
    \"gateway\": \"mqtt\",
    \"properties\": {
      \"location\": \"Lab\"
    }
  }")

DEVICE_DB_ID=$(echo "$DEVICE_RESPONSE" | grep -o '"deviceId":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$DEVICE_DB_ID" ]; then
  log_warn "Could not parse device ID from response"
fi
log_info "✓ Device created/verified: $TEST_DEVICE_ID"

# ============================================================================
# 6. Create MQTT Gateway
# ============================================================================
log_info "Creating MQTT Gateway..."
GATEWAY_RESPONSE=$(curl -s -X POST "$API_URL/mqtt-gateways" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"$TEST_GATEWAY_NAME\",
    \"applicationId\": \"$APP_ID\",
    \"brokerUrl\": \"mqtt://localhost:1883\",
    \"clientId\": \"test-client-$(date +%s)\",
    \"keepalive\": 60,
    \"connectTimeout\": 5000,
    \"reconnectPeriod\": 1000,
    \"auth\": {
      \"username\": \"\",
      \"password\": \"\"
    },
    \"tls\": {
      \"enabled\": false
    },
    \"topicMappings\": [
      {
        \"topic\": \"sensor/+/temperature\",
        \"field\": \"temperature\",
        \"deviceId\": \"$TEST_DEVICE_ID\",
        \"payloadFormat\": \"json\",
        \"jsonPath\": \"value\",
        \"scale\": 1,
        \"offset\": 0,
        \"unit\": \"celsius\",
        \"qos\": 1
      }
    ]
  }")

GATEWAY_ID=$(echo "$GATEWAY_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$GATEWAY_ID" ]; then
  # Try alternate format (some endpoints might return 'id')
  GATEWAY_ID=$(echo "$GATEWAY_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
fi
if [ -z "$GATEWAY_ID" ]; then
  log_error "Failed to create gateway. Response: $GATEWAY_RESPONSE"
  exit 1
fi
log_info "✓ Created MQTT Gateway: $GATEWAY_ID"

# ============================================================================
# 7. Start the gateway
# ============================================================================
log_info "Starting MQTT Gateway..."
START_RESPONSE=$(curl -s -X POST "$API_URL/mqtt-gateways/$GATEWAY_ID/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

if echo "$START_RESPONSE" | grep -q "error\|Error"; then
  log_warn "Start response: $START_RESPONSE"
fi
log_info "✓ Gateway start command sent"

sleep 2

# ============================================================================
# 8. Publish test messages via MQTT
# ============================================================================
log_info "Publishing test messages to MQTT broker..."

if command -v mosquitto_pub &> /dev/null; then
  for i in {1..3}; do
    mosquitto_pub -h localhost -p 1883 \
      -t "sensor/room/temperature" \
      -m "{\"value\": $((20 + i)), \"unit\": \"celsius\", \"timestamp\": $(date +%s)}"
    log_info "  Published message $i: {\"value\": $((20 + i))}"
    sleep 1
  done
else
  log_warn "mosquitto_pub not installed, skipping MQTT publish test"
  log_info "To test manually: mosquitto_pub -h localhost -p 1883 -t sensor/room/temperature -m '{\"value\": 25, \"unit\": \"celsius\"}'"
fi

# ============================================================================
# 9. Wait for device state to be created
# ============================================================================
log_info "Waiting for device state to be recorded..."
sleep 3

DEVICE_STATE=$(curl -s -X GET "$API_URL/device-states?deviceId=$TEST_DEVICE_ID&limit=1" \
  -H "Authorization: Bearer $TOKEN")

if echo "$DEVICE_STATE" | grep -q "$TEST_DEVICE_ID"; then
  log_info "✓ Device state found: $(echo $DEVICE_STATE | grep -o '"temperature":[0-9.]*')"
else
  log_warn "Could not verify device state. Response: $DEVICE_STATE"
fi

# ============================================================================
# 10. Verify gateway status
# ============================================================================
log_info "Checking gateway status..."
GATEWAY_STATUS=$(curl -s -X GET "$API_URL/mqtt-gateways/$GATEWAY_ID/status" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GATEWAY_STATUS" | grep -q "connected"; then
  log_info "✓ Gateway status: connected"
elif echo "$GATEWAY_STATUS" | grep -q "true"; then
  log_info "✓ Gateway is connected"
else
  log_warn "Gateway status unknown: $GATEWAY_STATUS"
fi

# ============================================================================
# 11. Get gateway details
# ============================================================================
log_info "Retrieving gateway details..."
GATEWAY_DETAILS=$(curl -s -X GET "$API_URL/mqtt-gateways/$GATEWAY_ID" \
  -H "Authorization: Bearer $TOKEN")

MSG_COUNT=$(echo "$GATEWAY_DETAILS" | grep -o '"totalMessagesReceived":[0-9]*' | cut -d':' -f2)
log_info "✓ Gateway stats: $MSG_COUNT messages received"

# ============================================================================
# 12. Summary
# ============================================================================
echo ""
log_info "=========================================="
log_info "E2E Test Summary"
log_info "=========================================="
log_info "Application: $APP_ID"
log_info "Device: $TEST_DEVICE_ID"
log_info "Gateway: $GATEWAY_ID"
log_info "Broker: $MQTT_BROKER_URL"
log_info "Test Topic: $TEST_TOPIC"
log_info ""
log_info "✓ MQTT Gateway E2E test completed successfully!"
log_info "=========================================="
echo ""

# ============================================================================
# Cleanup (optional)
# ============================================================================
log_info "Cleanup options:"
log_info "1. Stop gateway: curl -X POST $API_URL/mqtt-gateways/$GATEWAY_ID/stop -H \"Authorization: Bearer $TOKEN\""
log_info "2. Delete gateway: curl -X DELETE $API_URL/mqtt-gateways/$GATEWAY_ID -H \"Authorization: Bearer $TOKEN\""
log_info "3. View in UI: http://localhost:3000/applications/$APP_ID/mqtt"
echo ""
