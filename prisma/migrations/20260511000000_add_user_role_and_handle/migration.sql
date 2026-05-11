-- Migration: add_user_role_and_handle
-- Non-destructive: only adds new enum, columns, and table.
-- Does NOT alter the existing uid (Int) column.

-- 1. Create UserRole enum (idempotent via DO block)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'ROOT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add role column to User (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- 3. Add handle column to User (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "handle" TEXT;

-- 4. Add unique index on handle (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");

-- 5. Create AdminAuditLog table (idempotent)
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id"        TEXT        NOT NULL,
    "actorId"   TEXT        NOT NULL,
    "action"    TEXT        NOT NULL,
    "targetId"  TEXT,
    "args"      JSONB,
    "result"    TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- 6. Indexes on AdminAuditLog (idempotent)
CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorId_idx"   ON "AdminAuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- 7. Foreign key: AdminAuditLog.actorId -> User.id (skip if already exists)
DO $$ BEGIN
  ALTER TABLE "AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
