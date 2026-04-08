import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  getConfig,
  getPool,
  getSessionFromCookie,
  sendJson,
  setCorsHeaders,
  updateSessionActivity,
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

  const session = await getSessionFromCookie(pool, config.cookieName, req.headers.cookie)

  if (!session) {
    sendJson(res, 401, { error: 'UNAUTHENTICATED' })
    return
  }

  await updateSessionActivity(pool, session.sessionId)

  sendJson(res, 200, {
    user: session.user,
    session: {
      id: session.sessionId,
      expiresAt: session.expiresAt,
    },
  })
}
