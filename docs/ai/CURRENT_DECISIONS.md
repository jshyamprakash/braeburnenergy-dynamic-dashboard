# Current Decisions: C — RS256 License Production Upgrade (ADR-050)

## What Changed

### packages/license-cli
- `src/index.ts` v1.1.0: `generate-keypair` subcommand (crypto.generateKeyPairSync RSA-2048);
  `generate` gains `--algorithm rs256|hs256` (default rs256) + `--private-key <path>`;
  `verify` auto-detects algorithm from JWT header `alg` field; RS256 requires `--public-key`
- `package.json`: added `generate-keypair` script entry

### apps/api/src/config/config.ts
- Added `license.publicKey: process.env.LICENSE_PUBLIC_KEY || ''`

### apps/api/src/services/license.service.ts
- RS256 path: `jwt.verify(key, config.license.publicKey, { algorithms: ['RS256'] })` when publicKey set
- HS256 fallback: `jwt.verify(key, config.license.secret, { algorithms: ['HS256'] })` when only secret set

### apps/api/Dockerfile
- `ARG LICENSE_PUBLIC_KEY=""` in Stage 3 + `ENV LICENSE_PUBLIC_KEY=$LICENSE_PUBLIC_KEY` before USER switch

### .env.example (api + root)
- Added `LICENSE_PUBLIC_KEY=` with RS256 build-arg instructions

## Technical Implications
- Backward compat: existing HS256 deployments continue unmodified (no LICENSE_PUBLIC_KEY set)
- Private key never enters Docker image; customers cannot forge tokens even with image access
- Rotation: vendor regenerates keypair → rebuilds image with new public key → customer restarts
- Dev mode unchanged: NODE_ENV=development + no LICENSE_KEY → all modules enabled

## Constraints
- `private.pem` must never be committed — add to .gitignore if generating in-repo
- RS256 verify fails fast if LICENSE_PUBLIC_KEY contains an HS256 secret (alg mismatch caught)
