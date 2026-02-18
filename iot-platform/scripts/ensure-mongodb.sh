#!/bin/bash

# Ensure MongoDB replica set is running on port 27018
# This script is idempotent and safe to run multiple times

set -e

MONGO_PORT=27018
MONGO_DATA_DIR="$HOME/.mongodb-iot-platform/data"
MONGO_LOG_DIR="$HOME/.mongodb-iot-platform/log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗄️  Checking MongoDB replica set on port $MONGO_PORT...${NC}"

# Create directories if they don't exist
mkdir -p "$MONGO_DATA_DIR" "$MONGO_LOG_DIR"

# Check if MongoDB is already running on this port
if lsof -Pi :$MONGO_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${GREEN}✓ MongoDB is running on port $MONGO_PORT${NC}"

  # Verify replica set is initialized
  if mongosh --port $MONGO_PORT --eval "rs.status().ok" 2>/dev/null | grep -q "1"; then
    echo -e "${GREEN}✓ Replica set 'rs0' is initialized${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠ Initializing replica set 'rs0'...${NC}"
    mongosh --port $MONGO_PORT --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:$MONGO_PORT'}]})" 2>&1 | grep -v "^$" || true
    sleep 1
    exit 0
  fi
fi

# MongoDB is not running, start it
echo -e "${YELLOW}🚀 Starting MongoDB on port $MONGO_PORT...${NC}"

mongod \
  --replSet rs0 \
  --port $MONGO_PORT \
  --dbpath "$MONGO_DATA_DIR" \
  --logpath "$MONGO_LOG_DIR/mongod.log" \
  --fork \
  --bind_ip localhost \
  2>&1 | grep -E "forked|error|Error" || true

# Wait for MongoDB to start
sleep 2

# Verify it's running
if ! lsof -Pi :$MONGO_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${RED}✗ Failed to start MongoDB${NC}"
  exit 1
fi

echo -e "${GREEN}✓ MongoDB started on port $MONGO_PORT${NC}"

# Initialize replica set
echo -e "${YELLOW}⚙️  Initializing replica set 'rs0'...${NC}"
mongosh --port $MONGO_PORT --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:$MONGO_PORT'}]})" 2>&1 | grep -v "^$" || true

# Wait for replica set to be ready
sleep 1

# Verify
if mongosh --port $MONGO_PORT --eval "rs.status().ok" 2>/dev/null | grep -q "1"; then
  echo -e "${GREEN}✓ Replica set is ready!${NC}"
  exit 0
else
  echo -e "${RED}✗ Replica set initialization failed${NC}"
  exit 1
fi
