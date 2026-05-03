export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export type JWTPayload = {
  sub: string
  email: string
  iat?: number
  exp?: number
}
