type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export function success<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data }
  return Response.json(body, { status })
}

export function error(message: string, status = 400): Response {
  const body: ApiResponse = { success: false, error: message }
  return Response.json(body, { status })
}
