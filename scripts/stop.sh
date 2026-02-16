#!/bin/bash

# IoT Platform - Stop Script
# Gracefully stops all running services

echo "🛑 Stopping IoT Platform services..."

# Kill processes
pkill -f "next dev" 2>/dev/null && echo "  ✓ Frontend stopped" || echo "  • Frontend not running"
pkill -f "tsx watch" 2>/dev/null && echo "  ✓ Backend stopped" || echo "  • Backend not running"

echo ""
echo "✓ All services stopped"
