/**
 * ADR-052: Browser-side crypto utilities for passphrase-derived keypair authentication.
 *
 * Flow:
 * 1. PBKDF2(passphrase, 'KOSMOS_RECOVERY_V1', 600000, SHA-256) → 32-byte seed
 * 2. Seed forge PRNG → generate RSA-2048 keypair deterministically
 * 3. Sign challenge hex string using RSA-PSS SHA-256 (saltLength=32)
 * 4. Export public key as PEM
 *
 * Same passphrase always yields the same keypair across devices/browsers.
 */

import forge from 'node-forge';

const SALT = 'KOSMOS_RECOVERY_V1';
const ITERATIONS = 600000;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive RSA-2048 keypair from passphrase using PBKDF2.
 * Returns both the forge private key object and PEM-encoded public key.
 */
export async function deriveKeyPair(
  passphrase: string
): Promise<{ privateKey: forge.pki.PrivateKey; publicKeyPem: string }> {
  // PBKDF2: WebCrypto subtle API
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const seedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    KEY_LENGTH * 8
  );

  const seedBytes = new Uint8Array(seedBits);

  // Deterministic PRNG: provide `options.prng` so forge skips its native
  // browser crypto shortcut and uses the pure-JS BigInteger path instead.
  // `prng.getBytesSync` returns a binary string as forge's rng wrapper expects.
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

  // workers: 0 forces the synchronous prime-generation path where `rng` is honoured.
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001, prng: deterministicPrng } as any);

  // Export public key as PEM
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

  return { privateKey: keypair.privateKey, publicKeyPem };
}

/**
 * Sign a challenge (hex string) using RSA-PSS SHA-256.
 * Challenge hex string is encoded as UTF-8 bytes before signing to match backend expectation.
 * Returns base64-encoded signature.
 */
export function signChallenge(
  privateKey: forge.pki.PrivateKey,
  challengeHex: string
): string {
  // Create message digest
  const md = forge.md.sha256.create();
  md.update(challengeHex, 'utf8'); // Update with the hex string itself

  // Sign using RSA-PSS SHA-256 with saltLength=32
  const pss = forge.pss.create({
    md: forge.md.sha256.create(),
    mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
    saltLength: 32,
  });

  const signature = (privateKey as any).sign(md, pss);

  // Convert to base64
  return forge.util.encode64(signature);
}

/**
 * Verify a signature (for testing/validation).
 * Compares derived public key against a signature over a challenge.
 */
export function verifySignature(
  publicKeyPem: string,
  challengeHex: string,
  signatureBase64: string
): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const signature = forge.util.decode64(signatureBase64);

    // Create message digest
    const md = forge.md.sha256.create();
    md.update(challengeHex, 'utf8'); // Match signing behavior

    // Verify with PSS padding
    const pss = {
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32,
    };

    return (publicKey as any).verify(md, signature, pss);
  } catch {
    return false;
  }
}
