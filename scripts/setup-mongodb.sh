#!/bin/bash
# Setup MongoDB Replica Set for IoT Platform (Persistent Storage)

# Use permanent data directory in home folder
MONGO_DIR="$HOME/.mongodb-iot-platform"
MONGO_DATA="$MONGO_DIR/data"
MONGO_LOG="$MONGO_DIR/log"

echo "🔧 Setting up MongoDB Replica Set for IoT Platform..."
echo "📁 Data directory: $MONGO_DATA"

# Stop existing MongoDB on 27018 if running
echo "⏹️  Stopping any existing MongoDB on port 27018..."
mongosh --port 27018 admin --eval "db.shutdownServer()" 2>/dev/null
sleep 2

# Kill if still running
pkill -f "mongod.*27018" 2>/dev/null
sleep 1

# Create directories
mkdir -p "$MONGO_DATA"
mkdir -p "$MONGO_LOG"

# Start MongoDB with replica set
echo "🚀 Starting MongoDB replica set on port 27018..."
mongod --replSet rs0 \
  --port 27018 \
  --dbpath "$MONGO_DATA" \
  --logpath "$MONGO_LOG/mongod.log" \
  --fork \
  --bind_ip localhost

# Wait for MongoDB to start
sleep 3

# Initialize replica set (will fail if already initialized, that's ok)
echo "🔄 Initializing replica set..."
mongosh --port 27018 --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27018'}]})" 2>/dev/null

sleep 2

# Verify
echo ""
echo "✅ MongoDB Replica Set Status:"
mongosh --port 27018 --eval "
  print('Version: ' + db.version());
  print('Replica Set: ' + (rs.status().ok === 1 ? 'OK' : 'FAILED'));
  print('Port: 27018');
  print('Data Dir: $MONGO_DATA');
  print('');
  print('Databases:');
  db.adminCommand('listDatabases').databases.forEach(function(d) { 
    print('  - ' + d.name); 
  });
"

echo ""
echo "💡 To stop MongoDB:"
echo "   mongosh --port 27018 admin --eval \"db.shutdownServer()\""
echo ""
echo "💡 To start MongoDB again:"
echo "   $0"
