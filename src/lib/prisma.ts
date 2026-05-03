// Prisma 7 requires a driver adapter. Install: npm i @prisma/adapter-neon @neondatabase/serverless
// Then replace this import: import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@/app/generated/prisma/client'

type PrismaClientType = InstanceType<typeof PrismaClient>
const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType }

function createClient(): PrismaClientType {
  // TODO: swap for adapter-based constructor once adapter packages are installed:
  // const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  // return new PrismaClient({ adapter })
  // @ts-expect-error — adapter required by Prisma 7; configure before connecting to DB
  return new PrismaClient()
}

export const prisma: PrismaClientType = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
