#!/usr/bin/env ts-node
/**
 * @repo/license-cli
 *
 * Generates and verifies JWT license keys for the CaloriSense / Gas Turbine Platform.
 * Supports RS256 (production, asymmetric) and HS256 (dev/staging, symmetric) — ADR-050.
 * Also derives SuperAdmin RSA-2048 public key from passphrase (ADR-052).
 *
 * Usage:
 *   pnpm --filter @repo/license-cli run generate-keypair
 *   pnpm --filter @repo/license-cli run generate -- --customer "Acme" --algorithm rs256 --private-key private.pem
 *   pnpm --filter @repo/license-cli run verify   -- <LICENSE_KEY> --public-key public.pem
 *   pnpm --filter @repo/license-cli run superadmin-derive -- --passphrase "my-secret-phrase"
 */

import { Command } from 'commander';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_MODULES = ['combustion_dl', 'asset_life', 'be_agent'] as const;
type LicenseModule = typeof VALID_MODULES[number];

const MODULE_LABELS: Record<LicenseModule, string> = {
  combustion_dl: 'Combustion DL (CD Precursor Analytics)',
  asset_life:    'Asset Life & Fleet Analytics',
  be_agent:      'BE AGENT (Edge AI Framework)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveHs256Secret(cliSecret?: string): string {
  const secret = cliSecret ?? process.env.LICENSE_SECRET ?? '';
  if (!secret) {
    console.error('\n❌  No license secret found.');
    console.error('    Provide via --secret <value> or set the LICENSE_SECRET environment variable.\n');
    process.exit(1);
  }
  return secret;
}

function readPemFile(filePath: string, label: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`\n❌  ${label} file not found: ${resolved}\n`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function parseModules(raw: string): LicenseModule[] {
  const items = raw.split(',').map(s => s.trim()).filter(Boolean);
  const invalid = items.filter(m => !VALID_MODULES.includes(m as LicenseModule));
  if (invalid.length > 0) {
    console.error(`\n❌  Invalid module(s): ${invalid.join(', ')}`);
    console.error(`    Valid modules: ${VALID_MODULES.join(', ')}\n`);
    process.exit(1);
  }
  return items as LicenseModule[];
}

function hr(char = '─', width = 60): string {
  return char.repeat(width);
}

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

// ─── Generate Keypair Command ─────────────────────────────────────────────────

function runGenerateKeypair(opts: { outDir: string; bits: string }) {
  const bits = parseInt(opts.bits, 10);
  if (isNaN(bits) || bits < 2048) {
    console.error('\n❌  --bits must be an integer ≥ 2048\n');
    process.exit(1);
  }

  const outDir = path.resolve(opts.outDir);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const privPath = path.join(outDir, 'private.pem');
  const pubPath  = path.join(outDir, 'public.pem');

  fs.writeFileSync(privPath, privateKey,  { mode: 0o600 });
  fs.writeFileSync(pubPath,  publicKey);

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — RSA KEYPAIR GENERATED (ADR-050)');
  console.log(hr('═'));
  console.log(`  Algorithm : RS256 (RSA-${bits})`);
  console.log(`  Private   : ${privPath}`);
  console.log(`  Public    : ${pubPath}`);
  console.log(hr('─'));
  console.log('  Next steps:');
  console.log('  1. Generate license key:');
  console.log(`       pnpm --filter @repo/license-cli run generate -- \\`);
  console.log(`         --algorithm rs256 --private-key ${privPath} \\`);
  console.log(`         --customer "Customer Name" --modules combustion_dl`);
  console.log('  2. Build Docker image with public key baked in:');
  console.log(`       docker build --build-arg LICENSE_PUBLIC_KEY="$(cat ${pubPath})" .`);
  console.log('  3. Keep private.pem secret — never commit it to the repository.');
  console.log(hr('═') + '\n');
}

// ─── Generate Command ─────────────────────────────────────────────────────────

function runGenerate(opts: {
  customer: string;
  modules: string;
  expiresDays: string;
  algorithm: string;
  privateKey?: string;
  secret?: string;
}) {
  const alg = opts.algorithm.toUpperCase();
  if (alg !== 'RS256' && alg !== 'HS256') {
    console.error('\n❌  --algorithm must be rs256 or hs256\n');
    process.exit(1);
  }

  const modules = parseModules(opts.modules);
  const days    = parseInt(opts.expiresDays, 10);

  if (isNaN(days) || days < 0) {
    console.error('\n❌  --expires-days must be a non-negative integer (0 = never expires)\n');
    process.exit(1);
  }

  let signingKey: string | Buffer;
  if (alg === 'RS256') {
    if (!opts.privateKey) {
      console.error('\n❌  --private-key <path> is required for RS256\n');
      process.exit(1);
    }
    signingKey = readPemFile(opts.privateKey, 'Private key');
  } else {
    signingKey = resolveHs256Secret(opts.secret);
  }

  const payload: Record<string, unknown> = { customer: opts.customer, modules };
  const signOpts: jwt.SignOptions = { algorithm: alg as jwt.Algorithm };
  if (days > 0) signOpts.expiresIn = `${days}d`;

  const token = jwt.sign(payload, signingKey, signOpts);

  const decoded = jwt.decode(token) as Record<string, unknown>;
  const expiresAt = decoded.exp
    ? new Date((decoded.exp as number) * 1000).toISOString()
    : 'Never';

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — LICENSE KEY GENERATED');
  console.log(hr('═'));
  console.log(`  Customer  : ${opts.customer}`);
  console.log(`  Modules   : ${modules.length === 0 ? '(none)' : modules.join(', ')}`);
  console.log(`  Expires   : ${expiresAt}`);
  console.log(`  Algorithm : ${alg}`);
  console.log(hr());
  console.log('\n  LICENSE_KEY=');
  console.log(`  ${token}`);
  console.log('\n' + hr('─'));
  console.log('  Enabled Modules:');
  VALID_MODULES.forEach(m => {
    const enabled = modules.includes(m);
    console.log(`    ${enabled ? '✓' : '✗'}  ${padEnd(m, 15)}  ${MODULE_LABELS[m]}`);
  });
  console.log(hr('─'));
  console.log('  Add to customer .env:');
  console.log(`    LICENSE_KEY=${token}`);
  console.log(hr('═') + '\n');
}

// ─── Verify Command ───────────────────────────────────────────────────────────

function runVerify(token: string, opts: { publicKey?: string; secret?: string }) {
  // Auto-detect algorithm from JWT header
  const header = jwt.decode(token, { complete: true })?.header;
  const detectedAlg = (header?.alg as string | undefined)?.toUpperCase() ?? 'HS256';

  let verifyKey: string;
  let valid = true;
  let errorMsg = '';
  let decoded: Record<string, unknown> = {};

  if (detectedAlg === 'RS256') {
    if (!opts.publicKey) {
      console.error('\n❌  Token uses RS256 — provide --public-key <path>\n');
      process.exit(1);
    }
    verifyKey = readPemFile(opts.publicKey, 'Public key');
  } else {
    verifyKey = resolveHs256Secret(opts.secret);
  }

  try {
    decoded = jwt.verify(token, verifyKey, { algorithms: [detectedAlg as jwt.Algorithm] }) as Record<string, unknown>;
  } catch (err) {
    valid = false;
    errorMsg = (err as Error).message;
    decoded = (jwt.decode(token) as Record<string, unknown>) ?? {};
  }

  const customer  = (decoded.customer as string)  ?? '(unknown)';
  const modules   = (decoded.modules  as string[]) ?? [];
  const iat       = decoded.iat ? new Date((decoded.iat as number) * 1000).toISOString() : 'n/a';
  const expiresAt = decoded.exp ? new Date((decoded.exp as number) * 1000).toISOString() : 'Never';

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — LICENSE KEY VERIFICATION');
  console.log(hr('═'));
  console.log(`  Status    : ${valid ? '✅  VALID' : `❌  INVALID — ${errorMsg}`}`);
  console.log(`  Algorithm : ${detectedAlg}`);
  console.log(`  Customer  : ${customer}`);
  console.log(`  Issued At : ${iat}`);
  console.log(`  Expires   : ${expiresAt}`);
  console.log(hr('─'));
  console.log('  Module Entitlements:');
  VALID_MODULES.forEach(m => {
    const enabled = modules.includes(m);
    console.log(`    ${enabled ? '✓' : '✗'}  ${padEnd(m, 15)}  ${MODULE_LABELS[m]}`);
  });
  console.log(hr('═') + '\n');

  if (!valid) process.exit(1);
}

// ─── SuperAdmin Derive Command (ADR-052) ──────────────────────────────────────

const SA_PBKDF2_SALT       = 'KOSMOS_RECOVERY_V1';
const SA_PBKDF2_ITERATIONS = 600000;
const SA_KEY_LENGTH        = 32; // 256 bits

/**
 * Derive RSA-2048 public key PEM from passphrase.
 * Mirrors browser lib/crypto/derive-keypair.ts exactly:
 *   PBKDF2(passphrase, KOSMOS_RECOVERY_V1, 600000, SHA-256, 32 bytes) → seed
 *   Seed forge PRNG (repeating-byte counter mode) → RSA-2048 → publicKeyToPem()
 */
async function deriveSuperAdminPublicKey(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();

  // PBKDF2 via Node 20 WebCrypto (globalThis.crypto.subtle)
  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const seedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name:       'PBKDF2',
      salt:       encoder.encode(SA_PBKDF2_SALT),
      iterations: SA_PBKDF2_ITERATIONS,
      hash:       'SHA-256',
    },
    passphraseKey,
    SA_KEY_LENGTH * 8
  );

  const seedBytes = new Uint8Array(seedBits);

  // Deterministic PRNG: provide `options.prng` so forge skips its native
  // Node.js crypto shortcut (crypto.generateKeyPairSync) and uses the pure-JS
  // BigInteger implementation instead. `prng.getBytesSync` must return a
  // binary string — forge's createKeyPairGenerationState calls it via the rng
  // wrapper it builds from `options.prng`.
  let prngIndex = 0;
  const deterministicPrng = {
    getBytesSync: (count: number): string => {
      let result = '';
      for (let i = 0; i < count; i++) {
        result += String.fromCharCode(seedBytes[(prngIndex + i) % seedBytes.length]);
      }
      prngIndex += count;
      return result;
    },
  };

  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001, prng: deterministicPrng } as any);
  return forge.pki.publicKeyToPem(keypair.publicKey);
}

// ─── Export Private Key Command (ADR-053) ─────────────────────────────────────

/**
 * Derive RSA-2048 keypair and export the private key as PKCS#8 PEM to a file.
 * Derivation is identical to deriveSuperAdminPublicKey — same passphrase → same keypair.
 * Also prints the matching public key PEM for use with --rotate-public-key UI.
 */
async function runExportPrivateKey(opts: { passphrase?: string; output: string }) {
  const passphrase = opts.passphrase ?? process.env.SUPERADMIN_PASSPHRASE ?? '';

  if (!passphrase) {
    console.error('\n❌  Passphrase required.');
    console.error('    Provide via --passphrase <value> or set SUPERADMIN_PASSPHRASE env var.\n');
    process.exit(1);
  }

  const outputPath = path.resolve(opts.output);

  console.log('\n' + hr('─'));
  console.log('  Deriving RSA-2048 keypair from passphrase (this may take ~2-3 seconds)...');
  console.log(hr('─'));

  const encoder = new TextEncoder();

  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const seedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name:       'PBKDF2',
      salt:       encoder.encode(SA_PBKDF2_SALT),
      iterations: SA_PBKDF2_ITERATIONS,
      hash:       'SHA-256',
    },
    passphraseKey,
    SA_KEY_LENGTH * 8
  );

  const seedBytes = new Uint8Array(seedBits);

  let prngIndex = 0;
  const deterministicPrng = {
    getBytesSync: (count: number): string => {
      let result = '';
      for (let i = 0; i < count; i++) {
        result += String.fromCharCode(seedBytes[(prngIndex + i) % seedBytes.length]);
      }
      prngIndex += count;
      return result;
    },
  };

  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001, prng: deterministicPrng } as any);

  // Export private key as PKCS#8 PEM (-----BEGIN PRIVATE KEY-----)
  const privateKeyAsn1 = forge.pki.privateKeyToAsn1(keypair.privateKey);
  const privateKeyInfo = forge.pki.wrapRsaPrivateKey(privateKeyAsn1);
  const privateKeyPem  = forge.pki.privateKeyInfoToPem(privateKeyInfo);

  // Export matching public key PEM
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const singleLine   = publicKeyPem.replace(/\n/g, '\\n');

  // Write private key to disk with restrictive permissions
  fs.writeFileSync(outputPath, privateKeyPem, { mode: 0o600 });

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — SUPERADMIN PRIVATE KEY EXPORT (ADR-053)');
  console.log(hr('═'));
  console.log(`\n  Private key written to: ${outputPath}`);
  console.log(`  File permissions     : 600 (owner read/write only)`);
  console.log('\n' + hr('─'));
  console.log('  Matching Public Key PEM (paste into Key Rotation UI):\n');
  console.log(publicKeyPem);
  console.log(hr('─'));
  console.log('  Docker build command:\n');
  console.log(`    docker build \\`);
  console.log(`      --build-arg SUPERADMIN_PUBLIC_KEY="${singleLine}" \\`);
  console.log(`      -t kosmos-api ./iot-platform`);
  console.log('\n' + hr('─'));
  console.log('  ⚠  SECURITY WARNINGS:');
  console.log('     1. Keep this file secure — it grants SuperAdmin access to all systems');
  console.log('        using the matching public key.');
  console.log('     2. Never commit this file to source control.');
  console.log('     3. Transfer it encrypted (e.g. password-protected USB or SCP).');
  console.log(hr('═') + '\n');
}

async function runSuperAdminDerive(opts: { passphrase?: string }) {
  const passphrase = opts.passphrase ?? process.env.SUPERADMIN_PASSPHRASE ?? '';

  if (!passphrase) {
    console.error('\n❌  Passphrase required.');
    console.error('    Provide via --passphrase <value> or set SUPERADMIN_PASSPHRASE env var.\n');
    process.exit(1);
  }

  console.log('\n' + hr('─'));
  console.log('  Deriving RSA-2048 keypair from passphrase (this may take ~2-3 seconds)...');
  console.log(hr('─'));

  const publicKeyPem = await deriveSuperAdminPublicKey(passphrase);

  // Single-line version for Docker build-arg (strip newlines)
  const singleLine = publicKeyPem.replace(/\n/g, '\\n');

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — SUPERADMIN PUBLIC KEY (ADR-052)');
  console.log(hr('═'));
  console.log('\n  Public Key PEM:\n');
  console.log(publicKeyPem);
  console.log(hr('─'));
  console.log('  Docker build command:\n');
  console.log(`    docker build \\`);
  console.log(`      --build-arg SUPERADMIN_PUBLIC_KEY="${singleLine}" \\`);
  console.log(`      -t kosmos-api ./iot-platform`);
  console.log('\n' + hr('─'));
  console.log('  .env (development only):\n');
  console.log(`    SUPERADMIN_PUBLIC_KEY="${singleLine}"`);
  console.log('\n' + hr('─'));
  console.log('  ⚠  Keep passphrase secret — it is equivalent to a private key.');
  console.log('     The public key above is safe to embed in the Docker image.');
  console.log(hr('═') + '\n');
}

// ─── SA Recovery Sign Command (ADR-054) ──────────────────────────────────────

/**
 * Sign an Admin recovery challenge using the SA's private key file.
 * Output is the base64 RSA-PSS signature — the Admin pastes this as the RESPONSE STRING.
 */
function runSARecoverySign(opts: { challenge: string; privateKey: string }) {
  const keyPath = path.resolve(opts.privateKey);
  if (!fs.existsSync(keyPath)) {
    console.error(`\n❌  Private key file not found: ${keyPath}\n`);
    process.exit(1);
  }

  const keyPem = fs.readFileSync(keyPath, 'utf8');
  let privateKey: forge.pki.PrivateKey;
  try {
    privateKey = forge.pki.privateKeyFromPem(keyPem);
  } catch {
    console.error('\n❌  Failed to parse private key PEM. Ensure it is a valid RSA private key.\n');
    process.exit(1);
  }

  // Sign the challenge — same algorithm as verifySuperAdminChallenge on the backend:
  // SHA-256 digest of the challenge hex string (as UTF-8), RSA-PSS, saltLength=32
  const md = forge.md.sha256.create();
  md.update(opts.challenge, 'utf8');

  const pss = forge.pss.create({
    md:        forge.md.sha256.create(),
    mgf:       forge.mgf.mgf1.create(forge.md.sha256.create()),
    saltLength: 32,
  });

  const signature = (privateKey as any).sign(md, pss);
  const signatureBase64 = forge.util.encode64(signature);

  console.log('\n' + hr('═'));
  console.log('  KOSMOS PLATFORM — SA RECOVERY SIGNATURE (ADR-054)');
  console.log(hr('═'));
  console.log('\n  Give the RESPONSE STRING below to the Admin:\n');
  console.log('  ' + signatureBase64);
  console.log('\n' + hr('─'));
  console.log('  ⚠  This signature is single-use (challenge consumed on redeem).');
  console.log('     Do not share with anyone other than the account owner.');
  console.log(hr('═') + '\n');
}

// ─── CLI Definition ───────────────────────────────────────────────────────────

const program = new Command();

program
  .name('license-cli')
  .description('Generate and verify JWT license keys for the Kosmos Platform (ADR-048/050/052)')
  .version('1.3.0');

program
  .command('generate-keypair')
  .description('Generate an RSA-2048 keypair for RS256 license signing (ADR-050)')
  .option('-o, --out-dir <dir>',  'Output directory for private.pem and public.pem', '.')
  .option('-b, --bits <n>',       'RSA key size in bits (minimum 2048)', '2048')
  .action((opts) => runGenerateKeypair(opts));

program
  .command('generate')
  .description('Generate a new license key')
  .requiredOption('-c, --customer <name>',   'Customer name (embedded in JWT)')
  .option(
    '-m, --modules <list>',
    `Comma-separated enabled modules (${VALID_MODULES.join(', ')})`,
    'combustion_dl,asset_life,be_agent'
  )
  .option('-e, --expires-days <n>',     'Expiry in days (0 = never expires)', '365')
  .option('-a, --algorithm <alg>',      'Signing algorithm: rs256 (default) or hs256', 'rs256')
  .option('-k, --private-key <path>',   'Path to RSA private key PEM file (required for rs256)')
  .option('-s, --secret <string>',      'Shared secret for hs256 (overrides LICENSE_SECRET env var)')
  .action((opts) => runGenerate(opts));

program
  .command('verify <token>')
  .description('Verify and decode a license key (algorithm auto-detected from JWT header)')
  .option('-k, --public-key <path>',  'Path to RSA public key PEM file (required for RS256 tokens)')
  .option('-s, --secret <string>',    'Shared secret for HS256 tokens (overrides LICENSE_SECRET env var)')
  .action((token, opts) => runVerify(token, opts));

program
  .command('superadmin-derive')
  .description('Derive SuperAdmin RSA-2048 public key from passphrase (ADR-052) for Docker bake')
  .option('-p, --passphrase <string>', 'Recovery passphrase (overrides SUPERADMIN_PASSPHRASE env var)')
  .action((opts) => runSuperAdminDerive(opts));

program
  .command('export-private-key')
  .description('Export SuperAdmin private key as PKCS#8 PEM file for file-based login (ADR-053)')
  .option('-p, --passphrase <string>', 'Passphrase (overrides SUPERADMIN_PASSPHRASE env var)')
  .option('-o, --output <path>',       'Output file path', 'superadmin.private.pem')
  .action((opts) => runExportPrivateKey(opts));

program
  .command('sa-recovery-sign')
  .description('Sign an Admin recovery challenge with SA private key file (ADR-054)')
  .requiredOption('-c, --challenge <hex>',    'Challenge hex string (from recovery page)')
  .requiredOption('-k, --private-key <path>', 'Path to SA private key PEM file')
  .action((opts) => runSARecoverySign(opts));

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
