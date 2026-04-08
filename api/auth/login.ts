import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  createSession,
  findUserByIdentifier,
  generateRawToken,
  getAccountLockState,
  getConfig,
  getIp,
  getPool,
  hashToken,
  incrementFailedLoginWithLockout,
  markSuccessfulLogin,
  readJsonBody,
  sendJson,
  setCorsHeaders,
  setSessionCookie,
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
    sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' })
    return
  }

  let body: { identifier?: unknown; password?: unknown }
  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { error: 'INVALID_JSON' })
    return
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!identifier || !password) {
    sendJson(res, 400, { error: 'MISSING_CREDENTIALS' })
    return
  }

  const ipAddress = getIp(req)
  const userAgent = (req.headers['user-agent'] as string) ?? null

  const user = await findUserByIdentifier(pool, identifier, password)

  // ── Lockout check ───────────────────────────────────────────────────────
  if (user?.id) {
    const lockState = await getAccountLockState(pool, user.id)
    if (lockState.isLocked) {
      await writeAuditLog(pool, {
        userId: user.id,
        eventType: 'auth.login.blocked_locked',
        eventSeverity: 'warning',
        ipAddress,
        userAgent,
        payload: { identifier, lockedUntil: lockState.lockedUntil?.toISOString() ?? null },
      })
      sendJson(res, 423, {
        error: 'ACCOUNT_LOCKED',
        lockedUntil: lockState.lockedUntil?.toISOString() ?? null,
      })
      return
    }
  }

  // ── Credential validation ───────────────────────────────────────────────
  if (!user || user.status !== 'active' || !user.passwordMatches) {
    if (user?.id) {
      const { nowLocked } = await incrementFailedLoginWithLockout(pool, user.id)
      await writeAuditLog(pool, {
        userId: user.id,
        eventType: nowLocked ? 'auth.account.locked' : 'auth.login.failure',
        eventSeverity: nowLocked ? 'critical' : 'warning',
        ipAddress,
        userAgent,
        payload: { identifier },
      })
    } else {
      await writeAuditLog(pool, {
        userId: null,
        eventType: 'auth.login.failure',
        eventSeverity: 'warning',
        ipAddress,
        userAgent,
        payload: { identifier },
      })
    }
    sendJson(res, 401, { error: 'INVALID_CREDENTIALS' })
    return
  }

  // ── Successful login ────────────────────────────────────────────────────
  await markSuccessfulLogin(pool, user.id, ipAddress)

  const rawToken = generateRawToken()
  const refreshTokenHash = hashToken(rawToken)
  const session = await createSession(pool, config, user.id, refreshTokenHash, ipAddress, userAgent)

  setSessionCookie(res, config, rawToken, session.expiresAt)

  await writeAuditLog(pool, {
    userId: user.id,
    sessionId: session.id,
    eventType: 'auth.login.success',
    ipAddress,
    userAgent,
    payload: { role: user.role },
  })

  sendJson(res, 200, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
  })
}
