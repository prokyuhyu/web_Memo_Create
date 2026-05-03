export function checkVersion(
  serverRecord: { version: number },
  clientVersion: number,
): Response | null {
  if (serverRecord.version !== clientVersion) {
    return Response.json(
      { success: false, error: 'CONFLICT', data: { serverRecord, clientVersion } },
      { status: 409 },
    )
  }
  return null
}
