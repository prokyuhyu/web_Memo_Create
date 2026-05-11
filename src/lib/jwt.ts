import { SignJWT, jwtVerify } from 'jose'

const enc = (s: string) => new TextEncoder().encode(s)

export async function generateAccessToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(enc(process.env.JWT_SECRET!))
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(enc(process.env.JWT_REFRESH_SECRET!))
}

export async function verifyAccessToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, enc(process.env.JWT_SECRET!))
    return { userId: payload.userId as string, role: payload.role as string }
  } catch {
    return null
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, enc(process.env.JWT_REFRESH_SECRET!))
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}
