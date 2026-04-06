import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { ApiKey } from '../models';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import '../lib/request-context'; // ensure FastifyRequest augmentation is loaded

/**
 * Authentication Middleware
 *
 * Verifies JWT tokens or API keys and attaches user information to request.
 * Implements EPA-compliant authentication requirements.
 */

const authService = new AuthService();

/**
 * Extract JWT token or API key from Authorization header
 */
function extractToken(request: FastifyRequest): { type: 'jwt' | 'api_key'; token: string } | null {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>" or "Bearer <api_key>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];

  // Check if it's an API key (starts with iot_live_ or iot_test_)
  if (token.startsWith('iot_live_') || token.startsWith('iot_test_')) {
    return { type: 'api_key', token };
  }

  // Otherwise, assume it's a JWT
  return { type: 'jwt', token };
}

/**
 * Authentication middleware - verify JWT token or API key
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authData = extractToken(request);

  if (!authData) {
    throw new UnauthorizedError('Authentication required');
  }

  // Handle JWT authentication
  if (authData.type === 'jwt') {
    const payload = await authService.verifyToken(authData.token);

    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Verify user still exists and is active
    const user = await authService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or deleted');
    }

    // Check if password change is required
    if (user.mustChangePassword) {
      throw new ForbiddenError('You must change your password before continuing');
    }

    request.user = {
      id: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId ?? '',
      authType: 'jwt',
    };
  }
  // Handle API key authentication
  else if (authData.type === 'api_key') {
    // Fetch ALL active keys with this prefix, then hash-compare to find the match
    const candidateKeys = await ApiKey.find({
      prefix: authData.token.startsWith('iot_live_') ? 'iot_live_' : 'iot_test_',
      isActive: true,
    }).select('+keyHash').populate('userId');

    let apiKey: (typeof candidateKeys)[0] | null = null;
    for (const candidate of candidateKeys) {
      const isValid = await candidate.compareKey(authData.token);
      if (isValid) {
        apiKey = candidate;
        break;
      }
    }

    if (!apiKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    // Check if API key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedError('API key has expired');
    }

    // Update last used timestamp (fire-and-forget, don't await)
    ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => {});

    const user = apiKey.userId as any;

    request.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: apiKey.organizationId.toString(),
      authType: 'api_key',
      apiKeyPermissions: apiKey.permissions,
    };
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authData = extractToken(request);

  if (!authData) {
    // No token provided, but that's okay
    return;
  }

  // Handle JWT
  if (authData.type === 'jwt') {
    const payload = await authService.verifyToken(authData.token);

    if (payload) {
      // Token is valid, attach user info
      const user = await authService.getUserById(payload.userId);

      if (user && user.isActive) {
        request.user = {
          id: payload.userId,
          username: payload.username,
          email: payload.email,
          role: payload.role,
          organizationId: payload.organizationId ?? '',
          authType: 'jwt',
        };
      }
    }
  }
  // Handle API key
  else if (authData.type === 'api_key') {
    try {
      const candidateKeys = await ApiKey.find({
        prefix: authData.token.startsWith('iot_live_') ? 'iot_live_' : 'iot_test_',
        isActive: true,
      }).select('+keyHash').populate('userId');

      let apiKey: (typeof candidateKeys)[0] | null = null;
      for (const candidate of candidateKeys) {
        const isValid = await candidate.compareKey(authData.token);
        if (isValid) {
          apiKey = candidate;
          break;
        }
      }

      if (apiKey) {
        if (!apiKey.expiresAt || apiKey.expiresAt > new Date()) {
          const user = apiKey.userId as any;

          request.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            organizationId: apiKey.organizationId.toString(),
            authType: 'api_key',
            apiKeyPermissions: apiKey.permissions,
          };

          // Update last used (fire-and-forget)
          ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => {});
        }
      }
    } catch {
      // Silently fail for optional auth
    }
  }
}
