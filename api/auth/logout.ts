import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  clearSessionCookie,
  getConfig,
  getIp,
  getPool,
  getSessionFromCookie,
  revokeSession,
  setCorsHeaders,
  writeAuditLog,
} from '../lib/auth.js'

const config = getConfig()
const pool = getPool(config)

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res, config)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }))
    return
  }

  const session = await getSessionFromCookie(pool, config.cookieName, req.headers.cookie)

  if (session) {
    const ip = getIp(req)
    await revokeSession(pool, session.sessionId, ip, 'manual_logout')
    await writeAuditLog(pool, {
      userId: session.user.id,
      sessionId: session.sessionId,
      eventType: 'auth.logout',
      ipAddress: ip,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    })
  }

  clearSessionCookie(res, config)
  res.writeHead(204)
  res.end()
}
