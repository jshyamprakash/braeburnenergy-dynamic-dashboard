# Profile & Account Settings Implementation Decisions

## What Changed

### Pages & Components
- `apps/web/app/profile/page.tsx` — User account settings and session management page
- LogoutConfirmModal component — Irreversible logout-all confirmation with warning

### Key Features
- **Profile section:** Avatar initials, username, email, role badge, member since date, last login timestamp
- **Change password:** Current password + new password + confirm, EPA-compliant 5-check strength meter
- **Active sessions:** Type badge (access/refresh), IP address, user agent (60-char truncate), created/expires dates
- **Security actions:** "Logout all devices" button with red warning styling + confirmation modal
- **Session tracking:** Most-recently-created access token highlighted as "Current Session"

### Utilities & Validation
- `validatePassword()` function: 5 checks (length ≥8, uppercase, lowercase, number, special)
- `PasswordStrengthIndicator` component: Visual 5-bar strength meter with check marks
- Date formatting: Consistent locale formatting for timestamps
- Session auto-refresh after password change (new token issued)

## Technical Implications

- **No Redux:** Pure useState for profile, sessions, password form state
- **Auto-refresh:** Sessions list refetched after successful password change
- **Most-recent detection:** Access tokens sorted by createdAt descending, first = current
- **No JTI exposure:** Backend doesn't expose current token JTI, so highlight by recency instead
- **Type casting:** Response data cast via `as any` due to API typing limitations
- **Build:** Zero TypeScript errors, lucide-react icons (Lock, LogOut, AlertCircle, Check)

## Constraints Introduced

- **No per-session revoke:** Only logout-all available (backend limitation)
- **Password policy strict:** All 5 checks required (length, upper, lower, num, special)
- **Session identification:** Uses createdAt sorting, not JTI matching (cleaner frontend pattern)
- **Logout is final:** "Logout all" triggers immediate redirect to /login, calls AuthContext logout
- **Profile read-only:** Username/email/role not editable (deprioritized for POC)

## Next Backlog Items

1. **API Key Management** — service-to-service authentication
2. **System Admin Dashboard** — aggregated health metrics
3. **Workflow Advanced Features** — additional node types, bulk import
