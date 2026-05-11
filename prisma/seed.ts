import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ROOT_EMAIL = 'joyrunt0502@gmail.com'

function sanitizeHandleBase(email: string): string {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveHandle(base: string, excludeId?: string): Promise<string> {
  const check = async (candidate: string) => {
    const found = await prisma.user.findFirst({
      where: { handle: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
    return !!found
  }
  if (!(await check(base))) return base
  let counter = 2
  while (await check(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}

async function main() {
  // ── 1. Backfill handle for any existing user that doesn't have one ────────────
  const usersWithoutHandle = await prisma.user.findMany({
    where: { handle: null },
    select: { id: true, email: true },
  })

  for (const user of usersWithoutHandle) {
    const base = sanitizeHandleBase(user.email)
    const handle = await resolveHandle(base, user.id)
    await prisma.user.update({ where: { id: user.id }, data: { handle } })
    console.log(`  handle set: "${handle}" → ${user.email}`)
  }

  if (usersWithoutHandle.length === 0) {
    console.log('All users already have a handle.')
  }

  // ── 2. Assign ROOT role ───────────────────────────────────────────────────────
  const result = await prisma.user.updateMany({
    where: { email: ROOT_EMAIL },
    data: { role: 'ROOT' },
  })

  if (result.count === 0) {
    console.log(
      `\nNo user found with email ${ROOT_EMAIL}.\nRegister the account first, then run the seed again.`
    )
  } else {
    console.log(`\n${ROOT_EMAIL} is now ROOT.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
