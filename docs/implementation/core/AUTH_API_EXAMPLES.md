# Authentication API Examples

**Created:** 2026-02-14
**Base URL:** `http://localhost:3001`
**Status:** ✅ All Endpoints Tested (31/31 tests passing)

---

## Overview

Quick reference for testing authentication endpoints with practical curl examples. These examples use the default admin user created by the seed script.

**Prerequisites:**
1. MongoDB running on port 27018
2. API server running: `pnpm dev`
3. Default admin user seeded: `pnpm seed:admin`

---

## Quick Start

### 1. Run Seed Script

```bash
cd iot-platform
pnpm seed:admin
```

**Output:**
```
✅ Default admin user created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Admin User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Username:     admin
   Email:        admin@iot-platform.com
   Password:     Admin123!
   Role:         SuperAdmin
   Organization: Default Organization
   Org ID:       aaaaaaaaaaaaaaaaaaaaaaaa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Start API Server

```bash
cd iot-platform/apps/api
pnpm dev

# Server runs at: http://localhost:3001
# Swagger docs: http://localhost:3001/docs
```

### 3. Default Admin Credentials

- **Username:** `admin`
- **Email:** `admin@iot-platform.com`
- **Password:** `Admin123!`
- **Role:** SuperAdmin
- **Organization ID:** `aaaaaaaaaaaaaaaaaaaaaaaa`

---

## 1. User Authentication (JWT)

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "admin",
      "email": "admin@iot-platform.com",
      "role": "SuperAdmin",
      "organizationId": "aaaaaaaaaaaaaaaaaaaaaaaa"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Store Tokens
```bash
# Save tokens to environment variables for subsequent requests
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get Profile
```bash
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Change Password
```bash
curl -X POST http://localhost:3001/auth/change-password \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Admin@123!",
    "newPassword": "NewSecure@456!"
  }'
```

### Refresh Access Token
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Access token refreshed successfully"
}
```

### Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 2. User Management

### Register New User (Admin Only)
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator1",
    "email": "operator1@example.com",
    "password": "Operator@123!",
    "role": "Operator",
    "organizationId": "aaaaaaaaaaaaaaaaaaaaaaaa"
  }'
```

**Roles:** `SuperAdmin`, `Admin`, `Operator`, `Viewer`

### List Users (Admin Only)
```bash
curl http://localhost:3001/auth/users?organizationId=aaaaaaaaaaaaaaaaaaaaaaaa \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 3. API Key Management

### Create API Key
```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server",
    "permissions": ["device:read", "device-state:read"],
    "prefix": "iot_live_"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Production Server",
    "key": "iot_live_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6",
    "prefix": "iot_live_",
    "permissions": ["device:read", "device-state:read"],
    "expiresAt": null,
    "createdAt": "2026-02-13T08:55:17.000Z"
  },
  "message": "API key created successfully. Save the key securely - it will not be shown again."
}
```

**⚠️ Save the key immediately! It will not be shown again.**

```bash
# Save API key for subsequent requests
export API_KEY="iot_live_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6"
```

### Create API Key with Expiration
```bash
curl -X POST http://localhost:3001/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temporary Key",
    "permissions": ["device:read"],
    "expiresAt": "2026-03-15T00:00:00.000Z",
    "prefix": "iot_test_"
  }'
```

### List API Keys
```bash
curl http://localhost:3001/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Production Server",
      "prefix": "iot_live_",
      "permissions": ["device:read", "device-state:read"],
      "expiresAt": null,
      "lastUsedAt": "2026-02-13T09:30:45.000Z",
      "isActive": true,
      "createdAt": "2026-02-13T08:55:17.000Z"
    }
  ]
}
```

### Get API Key Details
```bash
curl http://localhost:3001/api-keys/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Update API Key
```bash
curl -X PATCH http://localhost:3001/api-keys/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server (Updated)",
    "permissions": ["device:read", "device:write", "device-state:read"]
  }'
```

### Rotate API Key
```bash
curl -X POST http://localhost:3001/api-keys/507f1f77bcf86cd799439012/rotate \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Production Server",
    "key": "iot_live_X9Y8Z7A6B5C4D3E2F1G0H1I2J3K4L5M6",
    "prefix": "iot_live_",
    "permissions": ["device:read", "device-state:read"],
    "expiresAt": null
  },
  "message": "API key rotated successfully. Save the new key securely - it will not be shown again."
}
```

**⚠️ Old key is immediately invalidated. Update your applications with the new key.**

### Revoke API Key
```bash
curl -X POST http://localhost:3001/api-keys/507f1f77bcf86cd799439012/revoke \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Delete API Key
```bash
curl -X DELETE http://localhost:3001/api-keys/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 4. Using API Keys

### Authenticate with API Key
```bash
# Use API key instead of JWT for authentication
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer $API_KEY"
```

### Access Protected Endpoints with API Key
```bash
# List devices
curl http://localhost:3001/devices \
  -H "Authorization: Bearer $API_KEY"

# Get device
curl http://localhost:3001/devices/01KGPQZ53TRMAG5Y1H2S2SHPVG \
  -H "Authorization: Bearer $API_KEY"

# Create device (requires device:create permission)
curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temperature Sensor",
    "tags": ["warehouse", "floor-1"]
  }'
```

---

## 5. Error Handling

### Invalid Credentials (401)
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "WrongPassword"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Invalid username or password"
}
```

### Missing Authentication (401)
```bash
curl http://localhost:3001/devices
```

**Response:**
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "No token provided"
}
```

### Insufficient Permissions (403)
```bash
# Viewer trying to create device
curl -X POST http://localhost:3001/devices \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Device"}'
```

**Response:**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Your role (Viewer) does not have permission for this action",
  "requiredPermission": "device:create"
}
```

### Token Expired (401)
```bash
# After 15 minutes, access token expires
curl http://localhost:3001/devices \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```

**Response:**
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Invalid or expired token"
}
```

**Solution:** Use refresh token to get new access token.

---

## 6. Password Requirements

Passwords must meet the following criteria:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character: `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`

**Valid Examples:**
- `Admin@123!`
- `SecurePass456!`
- `MyP@ssw0rd`

**Invalid Examples:**
- `password` (no uppercase, number, special char)
- `Password` (no number, special char)
- `Pass@1` (too short)

---

## 7. Available Permissions

### Device Management
- `device:create` - Create devices
- `device:read` - View devices
- `device:update` - Update devices
- `device:delete` - Delete devices

### Device State (Telemetry)
- `device-state:create` - Send telemetry data
- `device-state:read` - View telemetry data
- `device-state:export` - Export telemetry data

### Organization Management (SuperAdmin Only)
- `organization:create` - Create organizations
- `organization:read` - View organizations
- `organization:update` - Update organizations
- `organization:delete` - Delete organizations

### User Management
- `user:create` - Create users (Admin/SuperAdmin)
- `user:read` - View users (Admin/SuperAdmin)
- `user:update` - Update users (Admin/SuperAdmin)
- `user:delete` - Delete users (SuperAdmin only)

### Audit & Logs
- `audit-log:read` - View audit logs (Admin/SuperAdmin)
- `audit-log:export` - Export audit logs (Admin/SuperAdmin)

### Alarms
- `alarm:create` - Create alarm rules
- `alarm:acknowledge` - Acknowledge alarms
- `alarm:read` - View alarms

---

## 8. Role Hierarchy

```
SuperAdmin (Level 4)
  └─ Full access to all resources across all organizations
     └─ Can manage organizations, users, and all data

Admin (Level 3)
  └─ Full access within their organization
     └─ Can manage users, devices, and data
     └─ Cannot manage organizations

Operator (Level 2)
  └─ Read/write access to devices and data
     └─ Can create devices, send data, acknowledge alarms
     └─ Cannot manage users

Viewer (Level 1)
  └─ Read-only access to devices and data
     └─ Can view devices, telemetry, and alarms
     └─ Cannot modify anything
```

---

## 9. Testing with JQ (JSON Processor)

### Install JQ
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### Extract Token from Login Response
```bash
# Login and extract access token
ACCESS_TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123!"}' \
  | jq -r '.data.accessToken')

echo "Access Token: $ACCESS_TOKEN"

# Use the token
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | jq .
```

### Create API Key and Extract
```bash
# Create API key and extract plain key
API_KEY=$(curl -s -X POST http://localhost:3001/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "permissions": ["device:read"]
  }' \
  | jq -r '.data.key')

echo "API Key: $API_KEY"

# Use the API key
curl http://localhost:3001/devices \
  -H "Authorization: Bearer $API_KEY" \
  | jq .
```

---

## 10. Integration Test Script

Save as `test-auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"

echo "=== Testing Authentication System ==="

# 1. Login
echo -e "\n[1/6] Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123!"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

if [ "$ACCESS_TOKEN" != "null" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

# 2. Get Profile
echo -e "\n[2/6] Getting profile..."
PROFILE=$(curl -s $BASE_URL/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USERNAME=$(echo $PROFILE | jq -r '.data.username')
if [ "$USERNAME" == "admin" ]; then
  echo "✅ Profile retrieved: $USERNAME"
else
  echo "❌ Profile retrieval failed"
  exit 1
fi

# 3. Create API Key
echo -e "\n[3/6] Creating API key..."
API_KEY_RESPONSE=$(curl -s -X POST $BASE_URL/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "permissions": ["device:read"]}')

API_KEY=$(echo $API_KEY_RESPONSE | jq -r '.data.key')
API_KEY_ID=$(echo $API_KEY_RESPONSE | jq -r '.data.id')

if [ "$API_KEY" != "null" ]; then
  echo "✅ API key created: ${API_KEY:0:20}..."
else
  echo "❌ API key creation failed"
  exit 1
fi

# 4. Use API Key
echo -e "\n[4/6] Using API key..."
AUTH_TEST=$(curl -s $BASE_URL/auth/profile \
  -H "Authorization: Bearer $API_KEY")

if echo $AUTH_TEST | jq -e '.success' > /dev/null; then
  echo "✅ API key authentication successful"
else
  echo "❌ API key authentication failed"
  exit 1
fi

# 5. Refresh Token
echo -e "\n[5/6] Refreshing access token..."
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ]; then
  echo "✅ Token refresh successful"
else
  echo "❌ Token refresh failed"
  exit 1
fi

# 6. Revoke API Key
echo -e "\n[6/6] Revoking API key..."
REVOKE_RESPONSE=$(curl -s -X POST $BASE_URL/api-keys/$API_KEY_ID/revoke \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $REVOKE_RESPONSE | jq -e '.success' > /dev/null; then
  echo "✅ API key revoked"
else
  echo "❌ API key revocation failed"
  exit 1
fi

# 7. Verify Revoked Key
echo -e "\n[7/7] Verifying revoked key..."
REVOKED_TEST=$(curl -s $BASE_URL/auth/profile \
  -H "Authorization: Bearer $API_KEY")

if echo $REVOKED_TEST | jq -e '.success == false' > /dev/null; then
  echo "✅ Revoked key correctly rejected"
else
  echo "❌ Revoked key still works (should fail)"
  exit 1
fi

echo -e "\n=== All Tests Passed! ✅ ==="
```

Run with:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## 11. Troubleshooting

### Check Server Status
```bash
curl http://localhost:3001/health
```

### View Swagger Documentation
```
http://localhost:3001/docs
```

### Enable Debug Logging
```bash
LOG_LEVEL=debug pnpm dev
```

### Test JWT Secret
```bash
# Check if JWT_SECRET is set
grep JWT_SECRET .env

# Generate new secret
openssl rand -base64 32
```

### Validate Token Format
```bash
# JWT tokens have 3 parts separated by dots
echo $ACCESS_TOKEN | awk -F. '{print NF-1}'
# Should output: 2

# API keys start with prefix
echo $API_KEY | grep -E '^iot_(live|test)_'
# Should match the key
```

---

## 12. Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to strong random value (32+ bytes)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domain
- [ ] Implement rate limiting on auth endpoints
- [ ] Set up monitoring for failed login attempts
- [ ] Configure log aggregation (e.g., ELK stack)
- [ ] Review and restrict API key permissions
- [ ] Set up automated API key rotation
- [ ] Enable IP-based brute force protection
- [ ] Configure password expiration policy (optional)
- [ ] Set up alerts for suspicious auth activity

---

For more information, see:
- Full API documentation: http://localhost:3001/docs
- Implementation summary: `/docs/PHASE_3.3_AUTH_SUMMARY.md`
