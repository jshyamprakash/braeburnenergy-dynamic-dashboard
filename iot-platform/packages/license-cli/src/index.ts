#!/usr/bin/env ts-node
/**
 * @repo/license-cli
 *
 * Generates and verifies JWT license keys for the CaloriSense / Gas Turbine Platform.
 * Supports RS256 (production, asymmetric) and HS256 (dev/staging, symmetric) — ADR-050.
 *
 * Usage:
 *   pnpm --filter @repo/license-cli run generate-keypair
 *   pnpm --filter @repo/license-cli run generate -- --customer "Acme" --algorithm rs256 --private-key private.pem
 *   pnpm --filter @repo/license-cli run verify   -- <LICENSE_KEY> --public-key public.pem
 */

import { Command } from 'commander';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

// ─── CLI Definition ───────────────────────────────────────────────────────────

const program = new Command();

program
  .name('license-cli')
  .description('Generate and verify JWT license keys for the Kosmos Platform (ADR-048/050)')
  .version('1.1.0');

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

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
