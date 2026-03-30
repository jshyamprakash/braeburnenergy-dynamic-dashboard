# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy API package.json for dependency installation
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/ 2>/dev/null || true

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY . .

# Build TypeScript
WORKDIR /app/apps/api
RUN pnpm build

# =============================================================================
# Stage 3: Production
# =============================================================================
# ADR-050: Bake the RS256 public key into the image at build time.
# The customer receives an image with the public key embedded — they cannot
# forge license tokens without the private key (held by vendor only).
# Usage: docker build --build-arg LICENSE_PUBLIC_KEY="$(cat public.pem)" .
ARG LICENSE_PUBLIC_KEY=""

FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package.json ./package.json

# Bake LICENSE_PUBLIC_KEY into the runtime environment (ADR-050).
# Customers cannot override this without rebuilding the image.
ENV LICENSE_PUBLIC_KEY=$LICENSE_PUBLIC_KEY

# Switch to non-root user
USER fastify

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
