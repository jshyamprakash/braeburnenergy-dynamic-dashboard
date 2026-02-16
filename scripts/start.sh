#!/bin/bash

# IoT Platform - Start Script
# Stops any running instances and starts fresh

set -e

echo "🔍 Checking for running instances..."

# Kill any existing processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true

echo "✓ Cleaned up running processes"
echo ""
echo "🚀 Starting IoT Platform..."
echo ""
echo "Services will be available at:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  API Docs:  http://localhost:3001/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start with Turborepo
pnpm dev
