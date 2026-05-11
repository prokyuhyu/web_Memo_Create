# CONTEXT

## community/page.tsx — Modal (PostModal)

### Bug fixed: Tailwind arbitrary-value classes not applied in modal
Tailwind classes like `fixed inset-0 z-[9999]`, `bg-black/70`, `max-w-2xl`, `max-h-[90vh]`
were not rendering in the portal modal. Root cause unknown (likely JIT purge or portal
rendering context). Fix: replaced with inline `style` props for all layout-critical
properties. Non-layout classes (text color, font size, spacing helpers) kept as Tailwind.

**Pattern to follow for future modal/portal work:** use inline styles for position, z-index,
overflow, backdrop, and sizing; keep Tailwind only for color and typography utilities.

### `mounted` guard removed from PostModal
The original `useState(false)` + `if (!mounted) return null` hydration guard was removed.
`createPortal` now renders immediately. Do not re-add the guard; it caused a visible
flash-of-nothing on open.

### Files that must be edited together
- `src/app/(dashboard)/community/page.tsx` — contains both the page and `PostModal` inline.
  There is no separate modal component file; everything lives in this single file.
