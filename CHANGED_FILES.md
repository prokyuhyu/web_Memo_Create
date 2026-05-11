# CHANGED_FILES.md

This file records project file changes made during Claude Code sessions.

Rules:
- Update this file after every file creation, edit, deletion, or rename.
- Keep entries detailed enough that another assistant can understand what changed without rereading the entire diff.
- Do not include secrets or private credentials.
- Do not mark a change as verified unless a verification command or manual check was actually performed.

## Change Log

---

### 2026-05-11 (session 3)

**Task:** Implement v1 pinned notice feature using existing Note model

---

| Field | Detail |
|---|---|
| File | `src/app/api/v1/admin/notices/route.ts` |
| Change type | created |
| What changed | New ROOT-only admin API route. GET returns all pinned public notes. POST pins a public note by adding `__PINNED_NOTICE__` to its tags. DELETE unpins by removing the tag. Uses `requireRole(req, UserRole.ROOT)`, existing prisma client, and `success`/`error` helpers. |
| Why | Required to allow ROOT users to manage pinned notices without schema changes |
| Risk level | low |
| DB/schema changed | no |
| Migration required | no |
| Verification performed | File created, logic reviewed |

---

| Field | Detail |
|---|---|
| File | `src/app/api/v1/notices/pinned/route.ts` |
| Change type | created |
| What changed | New read-only API route (GET only). Returns active pinned public notes (isPublic=true, deletedAt=null, tags has `__PINNED_NOTICE__`), ordered by createdAt desc. Returns id, title, body, createdAt, updatedAt, authorName, authorHandle. Protected by middleware (requires valid JWT). |
| Why | Needed for community page to fetch pinned notices for display |
| Risk level | low |
| DB/schema changed | no |
| Migration required | no |
| Verification performed | File created, logic reviewed |

---

| Field | Detail |
|---|---|
| File | `src/app/(dashboard)/admin/notices/page.tsx` |
| Change type | created |
| What changed | New ROOT-only admin UI page at `/admin/notices`. Shows current pinned notices list with title, author, handle, createdAt, and note id. Provides an input+button to pin a note by ID. Per-notice Unpin button. Loading/error/success states. Dark dashboard style consistent with admin/users/page.tsx. |
| Why | Allows ROOT users to manage pinned notices via UI |
| Risk level | low |
| DB/schema changed | no |
| Migration required | no |
| Verification performed | File created, logic reviewed |

---

| Field | Detail |
|---|---|
| File | `src/app/(dashboard)/community/page.tsx` |
| Change type | edited |
| What changed | (1) Added `PinnedNotice` type. (2) Added `fetchPinnedNotices()` helper that calls `/api/v1/notices/pinned`. (3) Added `pinnedNotices` state. (4) `useEffect` now also fetches pinned notices on mount. (5) Added pinned notices section above the main feed with gold/amber styling and Pin icon. Clicking a pinned notice opens the existing PostModal. (6) Added `PINNED_TAG` constant and filtered `__PINNED_NOTICE__` from displayed tags in both card and modal views. (7) Added `Pin` to lucide-react imports. |
| Why | Show pinned notices at top of community page; filter internal tag from UI |
| Risk level | low — no changes to existing PostModal, community API, or comment behavior |
| DB/schema changed | no |
| Migration required | no |
| Verification performed | File edited, logic reviewed; PostModal not changed; community API not changed |

---

| Field | Detail |
|---|---|
| File | `src/app/(dashboard)/layout.tsx` |
| Change type | edited |
| What changed | (1) Added `Bell` to lucide-react import. (2) Changed ROOT-only nav from a single `Admin` item to two items: `Admin Users` (href `/admin/users`, Shield icon) and `Admin Notices` (href `/admin/notices`, Bell icon). Both remain visible only when `userRole === 'ROOT'`. |
| Why | Expose the Admin Notices page in the sidebar for ROOT users |
| Risk level | low — only additive change to ROOT-gated nav items |
| DB/schema changed | no |
| Migration required | no |
| Verification performed | File edited, imports verified |

---

### 2026-05-11 (session 2)

**Task:** Full project inspection → overwrite CONTEXT.md with accurate project map

| Field | Detail |
|---|---|
| File | `CONTEXT.md` |
| Change type | edited (full overwrite) |
| What changed | Replaced old partial context (community modal bug note only) with a complete 14-section project map covering: project identity, tech stack, file tree, route map, API route map, component map, library map, Prisma schema summary, auth/authz flow, historical fixes with current-code verification status, current goal queue (/command page — already fully implemented), workflow rules, and verification commands |
| Why | User requested accurate project documentation before further feature work |
| Risk level | low (documentation only — no application code changed) |
| DB/schema/API changed | No |
| Verification | All facts cross-checked against: package.json, prisma/schema.prisma, src/app/(dashboard)/layout.tsx, src/app/(dashboard)/command/page.tsx, src/app/(dashboard)/admin/users/page.tsx, src/app/(dashboard)/my/page.tsx, src/middleware.ts, src/lib/require-role.ts, src/lib/jwt.ts, src/app/api/v1/community/route.ts, src/app/api/v1/admin/roles/route.ts, src/components/Chat/ChatPanel.tsx |
| Remaining concerns | Admin role editing historical note says "draft + Save button" but current code fires PATCH immediately on select change — documented discrepancy in CONTEXT.md §11 |

---

### 2026-05-11

**Task:** Session initialization — create CLAUDE.md and CHANGED_FILES.md

| Field | Detail |
|---|---|
| File | `CLAUDE.md` |
| Change type | edited |
| What changed | Expanded from a single `@AGENTS.md` include to the full permanent workflow rules as specified by the user |
| Why | User requested CLAUDE.md contain permanent rules for all future sessions |
| Risk level | low |
| DB/schema/API changed | No |
| Verification | Read back via Read tool — content confirmed correct |
| Remaining concerns | None |

| Field | Detail |
|---|---|
| File | `CHANGED_FILES.md` |
| Change type | created |
| What changed | New file created to track all project file changes going forward |
| Why | User requested this tracking file as part of permanent workflow rules |
| Risk level | low |
| DB/schema/API changed | No |
| Verification | File created via Write tool |
| Remaining concerns | None |
