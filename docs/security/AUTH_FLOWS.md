# Authentication Flows — SuperAdmin & Admin

**ADRs:** ADR-052, ADR-053, ADR-054  
**Last updated:** 2026-04-03

---

## Role Hierarchy

```
SuperAdmin (platform provider / Sarvam Infotech)
  └── Admin (customer's primary operator — one per deployment)
        └── Operator, Viewer (created by Admin for day-to-day users)
```

SuperAdmin provisions one Admin account per customer deployment.  
Admin acts as the customer's internal super-user for all subsequent user management.

---

## 1. SuperAdmin Login (ADR-053)

SuperAdmin authenticates using an RSA-2048 private key file. The passphrase never enters the client's browser.

### One-time setup (on SuperAdmin's own machine)

```bash
pnpm --filter @repo/license-cli run export-private-key \
  -- --passphrase "your-secret-passphrase" --output superadmin.private.pem
```

- Writes `superadmin.private.pem` (file permissions: 600 — owner only)
- Also prints the **matching public key PEM** to the terminal — needed for Docker build or key rotation

Store the `.pem` file on an encrypted USB drive or password-manager vault. **Never commit it to source control.**

### Login flow

1. Navigate to `/superadmin-login` on the client's system
2. Click the drop zone and upload `superadmin.private.pem`
3. Browser reads the key, requests a one-time challenge from the backend
4. Browser signs the challenge using RSA-PSS SHA-256 (saltLength = 32)
5. Backend verifies the signature against the stored public key
6. JWT session issued → redirected to `/admin-management`

### Public key resolution order (backend)

| Priority | Source |
|---|---|
| 1 (highest) | MongoDB `system_configs` collection, `_id = 'superadmin_public_key'` |
| 2 (fallback) | `SUPERADMIN_PUBLIC_KEY` environment variable (Docker build-arg) |

If MongoDB is unreachable, the env var fallback is used so login is never broken by a DB outage.

---

## 2. SuperAdmin Public Key Rotation (ADR-053)

Use this when you want to change the SA credentials (e.g. periodic rotation, key compromise).

### Steps

1. **Generate new keypair** on SA's machine:
   ```bash
   pnpm --filter @repo/license-cli run export-private-key \
     -- --passphrase "new-passphrase" --output sa-new.pem
   ```
   Terminal prints the new **public key PEM** — copy it.

2. **Log in** to the client system using the current (old) key file.

3. Go to `/admin-management` → scroll to **"SuperAdmin Key Rotation"** section.

4. Paste the new public key PEM into the text area → click **"Rotate Public Key"**.

5. MongoDB is updated immediately. Next login must use `sa-new.pem`.

> Your current session remains valid after rotation. The change only affects the next login attempt.

---

## 3. Admin Account Creation (ADR-053)

### Steps

1. SuperAdmin logs in → `/admin-management`
2. If no Admin account exists, the page shows a **"Create Admin Account"** form
3. Fill in **username** and **email** → click "Create Admin Account"
4. Backend creates the account with a **randomly generated 12-character temp password** and sets `mustChangePassword = true`
5. A one-time modal displays the temp password with a copy button

   > This is the **only time** the temp password is shown. It is never stored in plaintext.

6. SuperAdmin securely hands the temp password to the Admin (in person, encrypted message, etc.)

---

## 4. Admin First Login — Forced Password Change (ADR-052 / ADR-053)

Every time an Admin receives a temp password (creation or reset), they must change it before accessing anything.

### Steps

1. Admin navigates to `/login` and signs in with the temp password
2. The platform detects `mustChangePassword = true` in the JWT payload
3. Admin is **automatically redirected** to `/profile`
4. A **red warning banner** appears: *"You must change your temporary password before accessing the platform"*
5. Admin uses the **Change Password** form:
   - Current password = the temp password
   - New password = must meet strength requirements (8+ chars, uppercase, lowercase, number, special)
6. On success:
   - `mustChangePassword` is cleared in the backend and Redux store
   - Admin is redirected to `/` (dashboard)

---

## 5. Admin Password Reset by SuperAdmin (ADR-053)

Use this when the Admin needs their credentials reset but can still be reached (e.g. account hand-off, policy reset).

### Steps

1. SuperAdmin logs in → `/admin-management`
2. The existing Admin account card is shown
3. Click **"Reset Password"**
4. A new 12-character temp password is generated → shown in the one-time modal
5. SuperAdmin securely hands it to the Admin
6. Admin logs in → forced to go through the password change flow (same as Section 4 above)

---

## 6. Admin Forgot Password — SA-Authorized Offline Recovery (ADR-054)

Use this when the Admin is **completely locked out** and the SuperAdmin cannot physically visit the site.  
This mechanism requires no internet connection between the SA's machine and the client system — only a phone call or SMS is needed.

### Admin's steps

1. Go to `/recovery` → click the **"SuperAdmin Recovery"** tab
2. Enter your **username** → click **"Generate Challenge"**
3. The page displays two items to share with the SuperAdmin:

   | Item | Length | Purpose |
   |---|---|---|
   | **Short token** (e.g. `KXMT7QAB`) | 8 chars | Read over the phone to confirm both parties have the same challenge |
   | **Challenge hex** | 64 hex chars | Paste into the CLI command below — send via SMS or email |

4. Wait for the **response string** from the SuperAdmin
5. Paste the response string into the "Response String" text area
6. Set a new password that meets the strength requirements
7. Click **"Reset Password"**
8. On success: log in with the new password → the platform forces another password change (Section 4)

### SuperAdmin's steps (offline — no internet needed)

1. Receive the challenge hex from the Admin (via SMS, email, or dictated over the phone)
2. On your own machine, run:
   ```bash
   pnpm --filter @repo/license-cli run sa-recovery-sign \
     -- --challenge <challenge-hex> --private-key superadmin.private.pem
   ```
3. The CLI prints the **response string** (base64 RSA-PSS signature, ~344 chars)
4. Send/read the response string back to the Admin

> The response string is single-use. If the Admin does not submit it before the challenge expires (15 minutes), a new challenge must be generated.

### Security properties

- The SA's private key never leaves their machine
- The response string can only be verified using the SA's stored public key — it cannot be forged
- After recovery, `mustChangePassword = true` is set — the Admin must set a different password on next login

---

## 7. Admin Self-Service Recovery (ADR-052)

Use this when the Admin previously configured a **personal recovery keypair** on their profile page (`/profile` → Recovery Setup section).

### Steps

1. Go to `/recovery` → stay on the **"Recovery Passphrase"** tab
2. Enter your **User ID** (MongoDB ObjectId — visible on your profile) and **recovery passphrase**
3. Click **"Reset Password"**
4. Backend verifies the passphrase-derived RSA signature against the stored `recoveryPublicKey`
5. Password reset → log in with the new password

> This method is only available if you completed recovery setup while you still had access. If you did not set up a recovery keypair, use Section 6 (SA-Authorized Recovery).

---

## 8. Summary Table

| Scenario | Who acts | Where | Mechanism |
|---|---|---|---|
| SA initial login | SuperAdmin | `/superadmin-login` | Upload `.pem` file → RSA-PSS challenge |
| SA key rotation | SuperAdmin | `/admin-management` | Paste new public key PEM |
| Create Admin | SuperAdmin | `/admin-management` | Temp password (one-time reveal) |
| Reset Admin password | SuperAdmin | `/admin-management` | New temp password (one-time reveal) |
| Forced password change | Admin | `/profile` | Current = temp, set new password |
| Forgot password (SA helps) | Admin + SA | `/recovery` + CLI | Offline challenge-response |
| Forgot password (self-service) | Admin | `/recovery` | Personal recovery keypair |

---

## 9. Security Notes

- **SA private key file:** Keep on encrypted USB or password-manager vault. Never commit to source control. Never share.
- **Temp passwords:** Generated with cryptographic randomness, shown once in the UI, never stored in plaintext.
- **Recovery challenges:** One-time-use — consumed on first successful redemption. Expire after 15 minutes.
- **SA-authorized recovery** always sets `mustChangePassword = true` — Admin must set a new password immediately after recovery.
- **Public key rotation** takes effect immediately on the next login attempt. Active JWT sessions are not revoked.
- **Key derivation** (for passphrase-based features): PBKDF2 (SHA-256, 600,000 iterations, salt = `KOSMOS_RECOVERY_V1`) → 32-byte seed → deterministic RSA-2048 via node-forge.
