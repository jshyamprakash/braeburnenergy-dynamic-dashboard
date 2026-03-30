# @repo/license-cli

License key generator and verifier for the **Kosmos Platform** (CaloriSense / Gas Turbine).

Keys are HS256 JWTs signed with `LICENSE_SECRET`. The platform verifies keys on startup via `LicenseService` (ADR-048).

---

## Setup

```bash
cd iot-platform
pnpm install
```

Set the license secret (must match `LICENSE_SECRET` in the customer's deployment):

```bash
export LICENSE_SECRET="your-secret-here"
```

Or pass it per-command with `--secret`.

---

## Commands

### `generate-keypair` — Create an RSA-2048 keypair (RS256, production)

```bash
pnpm --filter @repo/license-cli run generate-keypair -- [options]
```

| Option | Default | Description |
|---|---|---|
| `--out-dir <dir>` | `.` | Output directory for `private.pem` and `public.pem` |
| `--bits <n>` | `2048` | RSA key size (minimum 2048) |

> Keep `private.pem` secret. `public.pem` is baked into the customer Docker image.

---

### `generate` — Create a license key

```bash
pnpm --filter @repo/license-cli run generate -- [options]
```

| Option | Required | Default | Description |
|---|---|---|---|
| `--customer <name>` | ✓ | — | Customer name embedded in JWT |
| `--modules <list>` | | all modules | Comma-separated module keys |
| `--expires-days <n>` | | `365` | Expiry in days (`0` = never expires) |
| `--algorithm <alg>` | | `rs256` | Signing algorithm: `rs256` or `hs256` |
| `--private-key <path>` | RS256 only | — | Path to RSA private key PEM |
| `--secret <string>` | HS256 only | `$LICENSE_SECRET` | Shared secret override |

### `verify` — Check a license key

Algorithm is auto-detected from the JWT header (`alg` field).

```bash
# RS256 token
pnpm --filter @repo/license-cli run verify -- <LICENSE_KEY> --public-key public.pem

# HS256 token
pnpm --filter @repo/license-cli run verify -- <LICENSE_KEY> [--secret <string>]
```

---

## Module Tiers

| Key | Description |
|---|---|
| `combustion_dl` | CD Precursor DL Analytics (combustion_ml_engine MQTT device) |
| `asset_life` | Asset Life & Fleet Analytics (IBM Maximo integration) |
| `be_agent` | BE AGENT Edge AI Framework (be_sense_edge MQTT device) |

---

## RS256 Quickstart (Production)

```bash
# 1. Generate RSA-2048 keypair
pnpm --filter @repo/license-cli run generate-keypair

# 2. Generate RS256 license key (signs with private key)
./node_modules/.bin/ts-node src/index.ts generate \
  --customer "Acme Energy" \
  --modules "combustion_dl" \
  --algorithm rs256 \
  --private-key private.pem \
  --expires-days 365

# 3. Verify it
./node_modules/.bin/ts-node src/index.ts verify <TOKEN> --public-key public.pem

# 4. Build Docker image with public key baked in
docker build --build-arg LICENSE_PUBLIC_KEY="$(cat public.pem)" ./iot-platform/apps/api

# 5. Add generated LICENSE_KEY to customer .env — done.
```

---

## HS256 Examples (Dev/Staging)

### Tier 1 — Core only (no add-ons)
```bash
export LICENSE_SECRET="your-secret-here"
./node_modules/.bin/ts-node src/index.ts generate \
  --customer "Acme Energy" \
  --modules "" \
  --algorithm hs256 \
  --expires-days 365
```

### Tier 2 — Combustion DL add-on
```bash
./node_modules/.bin/ts-node src/index.ts generate \
  --customer "TurboCo Ltd" \
  --modules "combustion_dl" \
  --algorithm hs256 \
  --expires-days 365
```

### Tier 3 — Full platform (all modules)
```bash
./node_modules/.bin/ts-node src/index.ts generate \
  --customer "MegaFleet Corp" \
  --modules "combustion_dl,asset_life,be_agent" \
  --algorithm hs256 \
  --expires-days 730
```

### Never-expiring key (for internal use)
```bash
./node_modules/.bin/ts-node src/index.ts generate \
  --customer "Internal Demo" \
  --modules "combustion_dl,asset_life,be_agent" \
  --algorithm hs256 \
  --expires-days 0
```

### Verify any key (algorithm auto-detected)
```bash
# RS256:
./node_modules/.bin/ts-node src/index.ts verify <TOKEN> --public-key public.pem

# HS256:
./node_modules/.bin/ts-node src/index.ts verify <TOKEN>
```

---

## Customer Deployment

1. Generate key for the customer's tier
2. Add to their `.env`:
   ```
   LICENSE_KEY=<generated-token>
   LICENSE_SECRET=<your-secret>
   ```
3. Customer runs `docker compose up` — `LicenseService.init()` verifies the key on startup
4. Platform UI shows only the licensed tabs/widgets

## Upgrade Path

To add modules to an existing customer:

1. Run `generate` with the expanded module list
2. Send the new `LICENSE_KEY` to the customer
3. Customer updates `.env` and restarts the container — no image rebuild needed

## Security Notes

- Keep `LICENSE_SECRET` private — it is the signing key for all license tokens
- For production, upgrade to RS256 (see ADR-048): client holds the private key;
  public key is baked into the Docker image at build time
- Never commit `LICENSE_SECRET` to the repository
