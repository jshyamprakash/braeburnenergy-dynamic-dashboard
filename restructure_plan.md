# Frontend Code Review: Next.js Pattern Audit

## Context

Full audit of `iot-platform/apps/web` against Next.js 16 (App Router) + React 19 best practices.
Stack: Next.js 16.1.6 · React 19.2.4 · Redux Toolkit 2.x · TanStack Query 5.x · Tailwind v4
**Authorize each P-item individually before implementation begins.**

---

## What Is Already Done Well ✓

| Area | Status |
|---|---|
| Root `layout.tsx` is a Server Component (no `'use client'`) | ✓ |
| `lib/providers.tsx` correctly isolates all context providers behind `'use client'` | ✓ |
| `use(params)` for async dynamic route params (React 19 pattern) | ✓ |
| `next/navigation` used throughout (`useRouter`, `usePathname`, `useParams`) | ✓ |
| Redux Toolkit with typed `RootState` / `AppDispatch` and `useAppSelector` | ✓ |
| React Query hooks (`useDevice`, `useDeviceStates`) with proper query-key hierarchy | ✓ |
| WebSocket hooks (`useDeviceStateUpdates`, `useWorkflowExecutionUpdates`) abstracted | ✓ |
| Singleton `apiClient` with 401-auto-refresh and race-condition guard | ✓ |
| `lib/constants/ui-messages.ts` centralising button tooltip copy | ✓ |
| Tailwind v4 dark mode applied consistently across all components | ✓ |
| `next.config.ts`: `output: 'standalone'` for Docker + `reactStrictMode: true` | ✓ |

---

## Findings & Recommendations

### P1 — Route Protection: Replace `<ProtectedRoute>` with `middleware.ts`

**Finding:**
Every protected page wraps children in `<ProtectedRoute>`. Auth check runs in an
effect *after* hydration. React StrictMode double-invokes effects, causing a visible
redirect flicker. Middleware runs at the Edge before the response is sent — zero flash.

**Current pattern (every page):**
```tsx
// app/devices/page.tsx
export default function DevicesPage() {
  return <ProtectedRoute><DevicesContent /></ProtectedRoute>;
}
```

**Recommended pattern:**
```ts
// middleware.ts (root of apps/web)
export function middleware(request: NextRequest) {
  const token = request.cookies.get('iot_access_token')?.value
               ?? request.headers.get('authorization')?.split(' ')[1];
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
export const config = { matcher: ['/devices/:path*', '/workflows/:path*', ...] };
```

Pages drop the `<ProtectedRoute>` wrapper entirely. `ProtectedRoute.tsx` deleted.

**Note:** Tokens currently stored in `localStorage` — middleware reads cookies. Migration
needed: store `iot_access_token` in an `httpOnly` cookie on login (or a regular cookie
readable by middleware). Auth thunk must set the cookie alongside localStorage on login.

**Files:** `middleware.ts` (new) · `app/*/page.tsx` (remove wrapper) · `components/auth/ProtectedRoute.tsx` (delete) · `lib/store/slices/authSlice.ts` (set cookie on loginSuccess)
**Impact:** High — removes auth flash, simplifies every page.

---

### P2 — Add `loading.tsx` + `error.tsx` per Route Segment

**Finding:**
Zero `loading.tsx` or `error.tsx` files exist in `app/`. All loading/error states
are manual `if (loading) return <p>Loading...</p>`. No Suspense streaming, no
per-route error recovery (user must reload whole app on unhandled error).

**Recommended file additions:**
```
app/
├── loading.tsx                        ← root spinner
├── error.tsx                          ← root error boundary
├── applications/
│   ├── loading.tsx + error.tsx
│   └── [applicationId]/
│       └── loading.tsx + error.tsx
├── workflows/
│   ├── loading.tsx + error.tsx
│   └── [workflowId]/
│       └── loading.tsx + error.tsx
├── dashboards/
│   └── loading.tsx + error.tsx
└── profile/
    └── loading.tsx + error.tsx
```

`error.tsx` → `'use client'` with `reset()` prop. Reuse `DefaultErrorFallback`
already exported from `components/ErrorBoundary.tsx`.

**Files:** ~12 new files, each under 30 lines.
**Impact:** High — native error isolation + Suspense streaming ready.

---

### P3 — Inconsistent Data-Fetching Strategy

**Finding:**
Three patterns exist with no rule for which to use:

| Pattern | Used in | Problem |
|---|---|---|
| React Query hooks | Devices, DeviceStates | ✓ Correct |
| `useEffect` + `apiClient.get()` | Applications, Orgs | No cache, no deduplication |
| Redux async thunks | Workflows, Alarms, Retention | Overkill for read-only lists |

**Canonical rule going forward:**

| Data type | Pattern |
|---|---|
| Read-only server data (lists, details) | React Query `useQuery` |
| Mutations (create/update/delete) | React Query `useMutation` + invalidate |
| Shared cross-page UI state | Redux |
| Real-time/WebSocket data | Local `useState` fed by WS hook |
| Complex editor state (canvas nodes/edges) | Redux (justified) |

**Concrete action:** Migrate `applications/page.tsx` and `organizations/page.tsx`
from `useEffect` → React Query. Create `lib/hooks/useApplications.ts` and
`lib/hooks/useOrganizations.ts` following the same shape as `useDevices.ts`.

**Files:** `app/applications/page.tsx` · `app/organizations/page.tsx` · new `lib/hooks/useApplications.ts` · new `lib/hooks/useOrganizations.ts`
**Impact:** High — eliminates duplicate loading state, consistent cache invalidation.

---

### P4 — Monolithic Page Components

**Finding:**

| File | Lines | Problem |
|---|---|---|
| `app/applications/[applicationId]/page.tsx` | 751 | 4 useEffects, 14 useState, 3 inline delete modals |
| `app/profile/page.tsx` | 746 | Password, sessions, API keys all in one blob |
| `app/workflows/[workflowId]/page.tsx` | 472 | Canvas + toolbar + execution log + 8 modals |

**Recommended structure using `_components/` convention** (underscore = co-located,
not exposed as a route — Next.js App Router built-in pattern):

```
app/applications/[applicationId]/
├── page.tsx              ← shell + tabs only (< 60 lines)
└── _components/
    ├── DevicesTab.tsx
    ├── WorkflowsTab.tsx
    └── DashboardsTab.tsx

app/profile/
├── page.tsx              ← shell (< 40 lines)
└── _components/
    ├── ProfileInfoSection.tsx
    ├── ChangePasswordSection.tsx
    ├── ActiveSessionsSection.tsx
    └── ApiKeysSection.tsx
```

**Files:** Refactor of 3 page files → ~10 smaller components. Zero behaviour change.
**Impact:** Medium — major readability/maintainability win.

---

### P5 — `useWebSocket.ts` Module-Level Singleton

**Finding:**
Module-level mutable globals in `useWebSocket.ts`:
```ts
let socketInstance: Socket | null = null;
let connectionCount = 0;
let toastShown = false;
```
React StrictMode double-invokes effects. `connectionCount` can reach 2 on mount,
leaving a zombie socket. `toastShown` never resets across HMR cycles in dev.

**Recommended:** Move socket lifecycle into a `WebSocketProvider` added to `lib/providers.tsx`.
Single `useRef` owns the socket. Consumers use `useWebSocketContext()`.

```tsx
// lib/providers/WebSocketProvider.tsx
'use client';
export function WebSocketProvider({ children }) {
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    socketRef.current = io(WS_URL, { transports: ['websocket'] });
    return () => { socketRef.current?.disconnect(); };
  }, []);
  return (
    <WebSocketContext.Provider value={socketRef.current}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

**Files:** New `lib/providers/WebSocketProvider.tsx` · refactor `lib/hooks/useWebSocket.ts` · `lib/providers.tsx`
**Impact:** Medium — fixes StrictMode double-connect, removes global mutable state.

---

### P6 — `any` Types on API Responses

**Finding:**
`any` appears at call sites that already have correct types in `@repo/types`:
- `apiClient.get<any>('/applications?...')` → should be `apiClient.get<Application[]>`
- `apiClient.get<any>('/organizations?...')` → should be typed
- 3 `useEffect` fetches in `[applicationId]/page.tsx` use `any`
- `api-client.ts:137` — `response.json() as any` in error branch

**Files:** `app/applications/page.tsx` · `app/organizations/page.tsx` · `app/applications/[applicationId]/page.tsx`
**Impact:** Low effort / catches shape mismatches at compile time. No runtime change.

---

### P7 — Missing Skeleton Loaders

**Finding:** All loading states are `<p>Loading...</p>` text or a single spinner.
No skeleton components exist.

**Recommended:** Single reusable `<Skeleton>` primitive using Tailwind `animate-pulse`.
Apply in the 3 busiest pages as table-row placeholders.

```tsx
// components/ui/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className)} />;
}
```

**Files:** New `components/ui/Skeleton.tsx` · applied in `[applicationId]`, `profile`, `workflows` pages.
**Impact:** Low effort / visible UX improvement.

---

### P8 — `not-found.tsx` Missing

**Finding:** No `not-found.tsx` anywhere. Invalid dynamic IDs (e.g. `/devices/bad-id`)
result in blank state or silent navigation. `notFound()` from `next/navigation` is
never called in detail pages.

**Recommended:**
```tsx
// app/not-found.tsx (Server Component)
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <h1 className="text-2xl font-bold">404 — Page Not Found</h1>
      <Link href="/">Go Home</Link>
    </div>
  );
}
```
Detail pages: call `notFound()` when API returns null instead of navigating away.

**Files:** New `app/not-found.tsx` · `app/devices/[deviceId]/page.tsx` · `app/workflows/[workflowId]/page.tsx` · `app/dashboards/[dashboardId]/page.tsx`
**Impact:** Very low effort / proper 404 semantics.

---

## Priority Matrix

| # | Change | Effort | Impact | Risk |
|---|---|---|---|---|
| P1 | `middleware.ts` route protection | Medium | High | Low* |
| P2 | `loading.tsx` + `error.tsx` per route | Low | High | None |
| P3 | Standardize data fetching → React Query | Medium | High | Low |
| P4 | Split monolithic page files | Medium | Medium | None |
| P5 | WebSocket Provider pattern | Medium | Medium | Low |
| P6 | Eliminate `any` on API responses | Low | Medium | None |
| P7 | Skeleton loaders | Low | Low | None |
| P8 | `not-found.tsx` | Very Low | Low | None |

*P1 requires token to be set as a cookie (not just localStorage) for middleware to read it.

---

## Files That Require No Change

- `lib/providers.tsx` — correct wrapping pattern
- `lib/hooks/useAuth.ts` — thin Redux adapter, correct
- `lib/hooks/useDevices.ts` — React Query pattern, correct reference implementation
- `lib/api-client.ts` — singleton with refresh guard, solid
- `lib/store/index.ts` — RTK setup correct
- `components/navigation/Sidebar.tsx` — hydration guard is correct
- `components/navigation/TopBar.tsx` — no issues
- `next.config.ts` — minimal and correct
- `lib/constants/ui-messages.ts` — good pattern, extend as needed
