# CONTEXT.md

## 1. Project Identity

**AI Pro** — a full-stack productivity web app built with Next.js 16 App Router.

- Framework: Next.js 16.2.4 (App Router, not Pages Router)
- App type: Multi-feature dashboard SPA with auth, real-time chat, notes/community, file management, and calendar
- Major features: Auth (JWT + refresh tokens), Notes (private + public/community), File storage (S3), Calendar/Schedules, Real-time chat (Pusher), Sync engine with conflict resolution, Admin user/role management, Command console
- Database: PostgreSQL via Neon (`@neondatabase/serverless`), accessed through Prisma ORM
- Deployment: Vercel
- Styling: Tailwind CSS v4 (JIT, PostCSS plugin approach), dark GitHub-like theme (`#0d1117` background)
- State/data fetching: TanStack React Query v5, Axios with auto token refresh

---

## 2. Current Working Directory

Verified main project path: `C:\Users\USER\Desktop\ai-pro`

> Claude Code may open a worktree at `.claude/worktrees/`. Do NOT edit files there. Always target `C:\Users\USER\Desktop\ai-pro`.

---

## 3. Tech Stack

### Confirmed (from package.json)

| Category | Technology |
|---|---|
| Framework | Next.js 16.2.4 |
| React | 19.2.4 |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 5.22 + `@prisma/client` |
| Auth | JWT (`jose` 6.x), bcryptjs, refresh token rotation |
| Real-time | Pusher 5.x (server) + pusher-js 8.x (client) |
| File storage | AWS S3 (`@aws-sdk/client-s3`, presigner) |
| HTTP client | Axios 1.x (with interceptors) |
| Data fetching | TanStack React Query v5 |
| Validation | Zod v4 |
| Styling | Tailwind CSS v4, tailwind-merge, clsx |
| Date utils | date-fns v4 |
| Icons | lucide-react 1.x |
| TypeScript | v5 |
| Linting | ESLint 9 + eslint-config-next |

### Dev dependencies

`@tailwindcss/postcss`, `tsx` (for prisma seed), TypeScript types.

---

## 4. High-Level File Tree

```
ai-pro/
├── prisma/
│   ├── schema.prisma          ← DB schema (DO NOT touch without migration plan)
│   └── seed.ts                ← DB seed script
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Root layout (HTML shell)
│   │   ├── page.tsx           ← Root redirect (→ /community or /login)
│   │   ├── globals.css        ← Global styles + Tailwind import
│   │   ├── favicon.ico
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx     ← Dashboard shell (sidebar, sync, auth guard, ChatBubble)
│   │   │   ├── community/page.tsx
│   │   │   ├── files/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── notes/page.tsx
│   │   │   ├── my/page.tsx
│   │   │   ├── command/page.tsx
│   │   │   └── admin/
│   │   │       └── users/page.tsx
│   │   ├── api/v1/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── refresh/route.ts
│   │   │   ├── me/route.ts
│   │   │   ├── community/
│   │   │   │   ├── route.ts
│   │   │   │   └── [noteId]/comments/route.ts
│   │   │   │       └── [commentId]/route.ts
│   │   │   ├── notes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── files/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── schedules/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── chat/
│   │   │   │   ├── rooms/route.ts
│   │   │   │   ├── rooms/[roomId]/messages/route.ts
│   │   │   │   └── users/route.ts
│   │   │   ├── sync/
│   │   │   │   ├── route.ts
│   │   │   │   └── resolve/route.ts
│   │   │   └── admin/
│   │   │       ├── users/route.ts
│   │   │       └── roles/route.ts
│   │   └── generated/prisma/  ← Auto-generated Prisma types (do not edit)
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── UserSearchModal.tsx
│   │   ├── ConflictModal.tsx
│   │   └── Toast.tsx
│   ├── lib/
│   │   ├── api-client.ts      ← Axios instance + token refresh interceptor
│   │   ├── api-response.ts    ← success() / error() response helpers
│   │   ├── auth-middleware.ts ← requireAuth() — extracts userId from Bearer token
│   │   ├── jwt.ts             ← generateAccessToken / generateRefreshToken / verify*
│   │   ├── prisma.ts          ← Prisma singleton (globalThis pattern)
│   │   ├── pusher-client.ts   ← Pusher client singleton
│   │   ├── require-role.ts    ← requireRole(req, minRole) — DB-authoritative RBAC
│   │   ├── storage.ts         ← AWS S3 helpers
│   │   ├── sync-engine.ts     ← Client-side offline sync logic
│   │   └── version-check.ts   ← Optimistic concurrency version check util
│   ├── middleware.ts           ← Edge middleware: JWT check for /api/v1/* routes
│   ├── providers/
│   │   └── query-provider.tsx ← TanStack React Query provider
│   └── types/
│       └── index.ts           ← Shared TypeScript types (ApiResponse, JWTPayload)
├── public/                    ← Static assets
├── next.config.ts             ← Minimal Next.js config (no special options set)
├── tailwind.config.*          ← (Tailwind v4 uses CSS-first config via globals.css)
├── postcss.config.mjs         ← PostCSS with @tailwindcss/postcss plugin
├── tsconfig.json              ← TypeScript config (path alias: @/ → src/)
├── eslint.config.mjs          ← ESLint flat config
├── CLAUDE.md                  ← Permanent Claude workflow rules
├── CONTEXT.md                 ← This file — project map
└── CHANGED_FILES.md           ← File change log
```

---

## 5. Route Map

### Auth routes (route group: `(auth)`)

| URL | File | Notes |
|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | Public, JWT stored to localStorage |
| `/register` | `src/app/(auth)/register/page.tsx` | Public |

### Dashboard routes (route group: `(dashboard)`)

All wrapped by `src/app/(dashboard)/layout.tsx` — sidebar, sync engine, ChatBubble. Auth guard is **client-side** (checks `localStorage.accessToken`; redirects to `/login` if absent).

| URL | File | Access |
|---|---|---|
| `/community` | `src/app/(dashboard)/community/page.tsx` | All logged-in users |
| `/files` | `src/app/(dashboard)/files/page.tsx` | All logged-in users |
| `/calendar` | `src/app/(dashboard)/calendar/page.tsx` | All logged-in users |
| `/notes` | `src/app/(dashboard)/notes/page.tsx` | All logged-in users |
| `/my` | `src/app/(dashboard)/my/page.tsx` | All logged-in users |
| `/command` | `src/app/(dashboard)/command/page.tsx` | All logged-in users |
| `/admin/users` | `src/app/(dashboard)/admin/users/page.tsx` | ROOT only (client-enforced + API-enforced) |

---

## 6. API Route Map

Base URL: `/api/v1/`

Middleware at `src/middleware.ts` verifies JWT Bearer token for all `/api/v1/*` routes **except**:
- `/api/v1/auth/*` — always public
- `/api/v1/community` — public (read-only feed)
- `GET /api/v1/notes/[id]` — public (for isPublic notes)

### Auth

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/auth/login` | POST | Verify email+password, return accessToken + refreshToken | Reads User, writes RefreshToken |
| `/api/v1/auth/register` | POST | Create user account | Writes User |
| `/api/v1/auth/refresh` | POST | Rotate refresh token, issue new accessToken | Reads+writes RefreshToken |

### Profile

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/me` | GET | Return current user's profile (id, name, email, handle, role) | Reads User |

### Community (public notes feed)

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/community` | GET | Paginated public notes feed, full `body` returned (no truncation) | Reads Note + User |
| `/api/v1/community/[noteId]/comments` | GET | List comments on a public note | Reads Comment |
| `/api/v1/community/[noteId]/comments` | POST | Post a comment (auth required) | Writes Comment |
| `/api/v1/community/[noteId]/comments/[commentId]` | DELETE | Delete own comment | Deletes Comment |

### Notes (private)

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/notes` | GET/POST | List or create user's notes | Reads/Writes Note |
| `/api/v1/notes/[id]` | GET/PATCH/DELETE | Read, update, or soft-delete a note | Reads/Writes Note |

### Files

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/files` | GET/POST | List or upload files (S3 presigned) | Reads/Writes File |
| `/api/v1/files/[id]` | GET/DELETE | Download or delete a file | Reads/Deletes File |

### Schedules

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/schedules` | GET/POST | List or create schedules | Reads/Writes Schedule |
| `/api/v1/schedules/[id]` | GET/PATCH/DELETE | Read, update, or delete schedule | Reads/Writes Schedule |

### Chat

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/chat/rooms` | GET | List current user's chat rooms with last message | Reads ChatRoom, ChatRoomParticipant, ChatMessage |
| `/api/v1/chat/rooms` | POST | Create or return existing 1:1 room with targetUserId | Reads/Writes ChatRoom, ChatRoomParticipant |
| `/api/v1/chat/rooms/[roomId]/messages` | GET | Fetch messages in a room | Reads ChatMessage |
| `/api/v1/chat/rooms/[roomId]/messages` | POST | Send message; also triggers Pusher `new-message` event | Writes ChatMessage |
| `/api/v1/chat/users` | GET | Search users to start a chat | Reads User |

### Sync

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/sync` | POST | Push client changes, pull server updates, detect conflicts | Reads/Writes Note, Schedule, SyncLog |
| `/api/v1/sync/resolve` | POST | Resolve a specific sync conflict | Writes SyncLog |

### Admin (ROOT only)

| Route | Method | Description | DB |
|---|---|---|---|
| `/api/v1/admin/users` | GET | List all users (searchable by email/name/handle) | Reads User |
| `/api/v1/admin/roles` | PATCH | Change a user's role; writes AdminAuditLog | Writes User, AdminAuditLog |

---

## 7. Component Map

### `src/components/Chat/`

| File | Role |
|---|---|
| `ChatBubble.tsx` | Fixed bottom-right floating button. Decodes JWT from localStorage to get `currentUserId`. Renders `ChatPanel` when open. Shows unread badge. |
| `ChatPanel.tsx` | Full chat UI: room list view + message view. Pusher subscription for real-time messages + 3s polling fallback. Optimistic send with dedupe/upsert logic to prevent duplicate messages. Retry on failure. Supports Korean text (full-width rows, `break-words`). |
| `UserSearchModal.tsx` | Search users by name to start a new 1:1 chat. Calls `/api/v1/chat/users`. |

### `src/components/`

| File | Role |
|---|---|
| `ConflictModal.tsx` | Blocking overlay shown when sync detects conflicts. Allows resolve or defer. |
| `Toast.tsx` | Simple toast notification component. |

### Dashboard layout (`src/app/(dashboard)/layout.tsx`)

- `'use client'` — fully client-rendered
- Sidebar with nav links, collapse/expand, sync button, logout
- `SyncContext` provider exposes `addSyncItem()` to child pages
- `ChatBubble` always rendered at bottom of layout
- Nav items: Community, Files, Calendar, Notes, Command, My Page, and (if role === 'ROOT') Admin
- Auth guard: checks `localStorage.accessToken` on mount; redirects to `/login` if absent
- Role decoded from JWT payload (for sidebar nav only; not trusted for API authorization)

---

## 8. Library / Utility Map

| File | Purpose |
|---|---|
| `src/lib/api-client.ts` | Axios instance (`baseURL: /api/v1`). Request interceptor injects `Authorization: Bearer <token>` from localStorage. Response interceptor handles 401 → token refresh → retry. Race condition safe (single in-flight refresh promise). |
| `src/lib/api-response.ts` | `success(data, status?)` and `error(msg, status?)` helpers that return `NextResponse.json({ success, data/error })`. |
| `src/lib/auth-middleware.ts` | `requireAuth(request)` — extracts and verifies JWT Bearer token; throws `Response(401)` on failure. Returns `{ userId, role }`. |
| `src/lib/jwt.ts` | `generateAccessToken(userId, role)` (15 min), `generateRefreshToken(userId)` (7 days), `verifyAccessToken()`, `verifyRefreshToken()`. Uses `jose` with HS256. |
| `src/lib/prisma.ts` | Prisma client singleton (uses `globalThis` to avoid multiple instances in dev). |
| `src/lib/pusher-client.ts` | Singleton Pusher JS client. Uses `NEXT_PUBLIC_PUSHER_APP_KEY` and `NEXT_PUBLIC_PUSHER_APP_CLUSTER` env vars. |
| `src/lib/require-role.ts` | `requireRole(request, minRole)` — calls `requireAuth`, then fetches user from DB, checks `ROLE_RANK[user.role] >= ROLE_RANK[minRole]`. **Role is always read from DB — the JWT role is NOT trusted for authorization.** Returns `AuthenticatedUser`. |
| `src/lib/storage.ts` | AWS S3 upload/download/delete helpers using `@aws-sdk/client-s3` and presigned URLs. |
| `src/lib/sync-engine.ts` | Client-side offline sync logic: batches local changes, detects server conflicts, applies server updates. |
| `src/lib/version-check.ts` | Optimistic concurrency: compares client and server `version` fields to detect stale writes. |

---

## 9. Database / Prisma Map

Schema file: `prisma/schema.prisma`. Provider: PostgreSQL (Neon). **Do not run migrations or reset without explicit user confirmation.**

### Enums

| Enum | Values |
|---|---|
| `UserRole` | `USER`, `ADMIN`, `ROOT` |
| `EntityType` | `FILE`, `SCHEDULE`, `NOTE` |
| `SyncAction` | `CREATE`, `UPDATE`, `DELETE`, `CONFLICT` |
| `ResolvedBy` | `CLIENT`, `SERVER`, `PENDING` |
| `TriggerType` | `TIME_BASED`, `CONDITION_BASED`, `EVENT_BASED` |

### Models

| Model | Key Fields | Notes |
|---|---|---|
| `User` | `id` (cuid), `email` (unique), `password`, `name`, `uid Int @default(0)` (**must be preserved**), `handle String? @unique`, `role UserRole @default(USER)` | Initial ROOT: joyrunt0502@gmail.com |
| `RefreshToken` | `token` (unique), `userId`, `expiresAt` | Cascades on User delete |
| `File` | `userId`, `originalName`, `storedName`, `mimeType`, `size`, `path`, soft `deletedAt` | S3 storage |
| `Schedule` | `userId`, `title`, `startAt`, `endAt?`, `notifyAt?`, `version`, soft `deletedAt` | Sync-tracked |
| `Note` | `userId`, `title`, `body`, `tags String[]`, `isPublic`, `version`, soft `deletedAt` | Public notes → community feed |
| `SyncLog` | `userId`, `entityType`, `entityId`, `action`, `clientVersion`, `serverVersion`, `resolvedBy` | Tracks sync state |
| `ChatRoom` | `name?`, `isPersonal` | 1:1 rooms have `isPersonal=false` but only 2 participants |
| `ChatRoomParticipant` | `roomId`, `userId` — unique pair | Join table |
| `ChatMessage` | `roomId`, `senderId`, `content` | Indexed on `[roomId, createdAt]` |
| `Macro` | `userId`, `name`, `triggerType`, `triggerConfig Json`, `actionType`, `actionConfig Json`, `isActive` | Automation macros (UI not yet visible) |
| `Comment` | `noteId`, `userId`, `content` | On public notes |
| `AdminAuditLog` | `actorId`, `action`, `targetId?`, `args Json?`, `result` | Written on role changes |

### Critical constraints to preserve

- `uid Int @default(0)` on User — must NOT be removed (existing Neon DB rows depend on it)
- `handle String? @unique` — new field, used for admin/search/command
- `UserRole` enum with USER / ADMIN / ROOT

---

## 10. Authentication / Authorization Flow

### Login flow (confirmed)

1. Client POSTs `{ email, password }` to `/api/v1/auth/login`
2. Server verifies password with `bcryptjs.compare` (timing-safe: always runs compare even if user not found)
3. Issues `accessToken` (JWT, 15 min, HS256, payload: `{ userId, role }`) and `refreshToken` (JWT, 7 days)
4. Client stores both in `localStorage`
5. All API requests include `Authorization: Bearer <accessToken>`

### Token refresh (confirmed)

- Axios interceptor catches 401 responses
- Single in-flight refresh promise (prevents parallel refresh races)
- Calls `/api/v1/auth/refresh` with `{ refreshToken }`
- On success: stores new tokens, retries original request
- On failure: clears storage, redirects to `/login`

### Middleware (Edge, confirmed)

`src/middleware.ts` runs on all routes except `_next/static|_next/image|favicon.ico`.
- `/api/v1/auth/*` — always passes through
- `/api/v1/community*` — always passes through (public feed)
- `GET /api/v1/notes/*` — passes through (per-note `isPublic` check in handler)
- All other `/api/v1/*` — verifies JWT with `jwtVerify`; returns 401 if invalid

### Route-level auth (confirmed)

- `requireAuth()` in `src/lib/auth-middleware.ts` — used by most protected routes; returns `{ userId, role }`
- `requireRole(req, minRole)` in `src/lib/require-role.ts` — **always reads role from DB**, not from JWT. Used by admin routes. Hierarchy: USER(0) < ADMIN(1) < ROOT(2)

### Dashboard auth guard (confirmed)

Client-side only. `src/app/(dashboard)/layout.tsx` checks `localStorage.accessToken` on mount and redirects to `/login` if absent. The sidebar Admin link only appears when the JWT payload's `role === 'ROOT'` (cosmetic only; the API enforces it server-side).

---

## 11. Known Important Historical Fixes

- **Community modal full-body**: Fixed by returning `note.body` in full from `src/app/api/v1/community/route.ts` (no 200-char truncation). ✅ Confirmed in current code.
- **Community modal portal/Tailwind**: Modal layout-critical styles use inline `style` props; Tailwind kept only for color/typography. ✅ Pattern confirmed in `src/app/(dashboard)/community/page.tsx`.
- **Chat duplicate message**: Fixed with `upsertMessage()` and `isSameOutgoingPending()` dedupe logic in `src/components/Chat/ChatPanel.tsx`. ✅ Confirmed in current code.
- **Chat pending spinner**: Removed from UI while keeping `isPending` field internally. ✅ Confirmed — no spinner in JSX.
- **Chat Korean wrapping**: Fixed with full-width message rows + `justify-end`/`justify-start`. ✅ Confirmed in ChatPanel.tsx.
- **USER / ADMIN / ROOT role system**: Added. ✅ Confirmed in schema and `require-role.ts`.
- **Initial ROOT email**: `joyrunt0502@gmail.com`. (Not directly visible in code; taken from historical record.)
- **`uid Int @default(0)` must be preserved**: ✅ Confirmed present in `schema.prisma`.
- **`handle String? @unique`**: ✅ Confirmed present in `schema.prisma`.
- **`/my` page exists**: ✅ Confirmed at `src/app/(dashboard)/my/page.tsx`.
- **`/admin/users` ROOT-only**: ✅ Confirmed — client checks JWT role, API uses `requireRole(req, UserRole.ROOT)`.
- **Admin Users page shows name, email, handle, role**: ✅ Confirmed in `admin/users/page.tsx`.
- **Admin role editing uses select + immediate PATCH** (not draft + Save): Current code shows `onChange → changeRole()` fires immediately on select change, no Save button. Historical note says "local draft state and Save button" — **this does NOT match the current code**. The current implementation fires the PATCH immediately on `<select onChange>`.
- **Neon DB baseline**: Do not reset or use `--accept-data-loss`. ✅ Rule in CLAUDE.md.

---

## 12. Current Goal Queue

**Current goal:**  
Make `/command` work in the main project.

**Command page status (verified 2026-05-11):**

| Item | Status |
|---|---|
| `src/app/(dashboard)/command/page.tsx` | ✅ EXISTS — fully implemented local terminal UI |
| `src/app/(dashboard)/layout.tsx` sidebar nav | ✅ EXISTS — `{ label: 'Command', href: '/command', Icon: Terminal }` present in `BASE_NAV` |
| `Terminal` icon from `lucide-react` | ✅ IMPORTED in layout.tsx |
| Visible to all logged-in users | ✅ YES — in `BASE_NAV` (not role-gated) |
| Frontend-only local React state | ✅ YES — no API calls, no DB changes |
| No permissions / no API calls / no DB changes | ✅ CONFIRMED |

**Conclusion: `/command` is already fully implemented.** The page and sidebar nav item both exist. No further work is needed unless the user wants to extend the command set or add new features.

---

## 13. Safe Workflow Rules For Future Claude Tasks

- Always check `pwd` first — shell may reset to worktree.
- Always check `git status --short` before edits.
- Verify file existence with `Test-Path "path"` before assuming.
- Verify text changes with `Select-String -Path "..." -Pattern "..."`.
- For non-trivial changes, test on localhost before `git push`.
- Use `npm.cmd` and `npx.cmd` on Windows PowerShell.
- Do NOT run `npx prisma migrate reset`.
- Do NOT run `npx prisma db push --accept-data-loss`.
- If Prisma warns about data loss, STOP and ask the user.
- Keep these as separate steps: file changes (Git) / schema changes (Prisma migration) / real DB changes (Neon) / deployment (git push + Vercel).
- Do not push to GitHub unless the user explicitly asks.
- Update `CHANGED_FILES.md` after every file change.
- Use `CONTEXT.md` as the project map — update it when major structure changes.

---

## 14. Verification Commands

```powershell
# Navigate to main project
cd "$env:USERPROFILE\Desktop\ai-pro"

# Verify location
pwd

# Check git status
git status --short

# Verify command page exists
Test-Path "src/app/(dashboard)/command/page.tsx"

# Verify Command nav item in layout
Select-String -Path "src/app/(dashboard)/layout.tsx" -Pattern "Command|Terminal"

# Verify full body in community API
Select-String -Path "src/app/api/v1/community/route.ts" -Pattern "body"

# Start dev server
npm.cmd run dev

# Check admin users route requires ROOT
Select-String -Path "src/app/api/v1/admin/users/route.ts" -Pattern "ROOT"

# Check role rank definition
Select-String -Path "src/lib/require-role.ts" -Pattern "ROLE_RANK"
```
