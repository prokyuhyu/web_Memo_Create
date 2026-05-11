@AGENTS.md

# CLAUDE.md

## Permanent Workflow Rules

- Always verify the current directory with `pwd` before making changes.
- Main project path is `C:\Users\USER\Desktop\ai-pro`.
- Do not work inside `.claude/worktrees` unless explicitly instructed.
- Use Windows PowerShell syntax.
- Use `npm.cmd` instead of `npm` when needed.
- Use `npx.cmd` instead of `npx` when needed.
- Check `git status --short` before edits.
- Do not assume a file exists. Verify with `Test-Path`.
- Do not assume a change worked. Verify with `Select-String`, `git diff`, or direct file reads.
- Do not run destructive database commands.
- Never casually run:
  - `npx prisma migrate reset`
  - `npx prisma db push --accept-data-loss`
- If Prisma warns about data loss, stop and ask the user.
- Separate these concepts:
  - file changes = Git
  - schema changes = Prisma migration / SQL
  - real DB changes = Neon / Prisma migrate
  - deployment = git push + Vercel
- Do not push to GitHub unless the user explicitly asks.
- For non-trivial changes, verify locally before suggesting push.
- Prefer minimal, targeted file reads instead of scanning the whole project every time.
- Use CONTEXT.md as the project map.
- Update CHANGED_FILES.md after every file change.

## Documentation Rule

Whenever you create, edit, delete, or rename any project file, update CHANGED_FILES.md in the project root.

If CHANGED_FILES.md does not exist, create it.

Every entry must include:
- Date/time if available
- Task summary
- Changed file path
- Type of change: created / edited / deleted / renamed
- What changed
- Why it changed
- Risk level: low / medium / high
- Whether DB/schema/API behavior changed
- Verification command or manual check
- Remaining concerns if any

Do not include secrets, API keys, database URLs, or private credentials in CHANGED_FILES.md.
