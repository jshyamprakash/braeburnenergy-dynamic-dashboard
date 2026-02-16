#!/bin/bash

# IoT Platform - Status Check Script
# Checks if services are running and accessible

echo "🔍 IoT Platform - Service Status"
echo "================================="
echo ""

# Check Backend
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "✅ Backend API:  http://localhost:3001"
    echo "   └─ Process:   $(lsof -ti:3001)"

    # Test health endpoint
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   └─ Health:    OK"
    else
        echo "   └─ Health:    ⚠️  Not responding"
    fi
else
    echo "❌ Backend API:  Not running"
fi

echo ""

# Check Frontend
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend:     http://localhost:3000"
    echo "   └─ Process:   $(lsof -ti:3000)"
else
    echo "❌ Frontend:     Not running"
fi

echo ""

# Database connection
if psql -U shyamprakashj -d iot_platform -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database:     PostgreSQL (iot_platform)"
else
    echo "❌ Database:     Not accessible"
fi

echo ""
echo "================================="
echo "Access Points:"
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:3001"
echo "  Docs:      http://localhost:3001/docs"
