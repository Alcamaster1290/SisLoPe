/**
 * SisLoPe Auth Library — Vercel Serverless Functions
 *
 * Canonical version: adex-palletizer-web/server/src/auth.ts
 * This module mirrors the auth logic from ADEX-Palletizer so both apps
 * authenticate against the same shared Neon PostgreSQL database.
 * Keep in sync when the canonical version changes.
 */

import { createHash, randomBytes } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import pg from 'pg'

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_COOKIE_NAME = 'sislope_refresh_token'
const DEFAULT_SESSION_TTL_DAYS = 30
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MINUTES = 15

export interface SisLopeAuthConfig {
  databaseUrl: string
  cookieName: string
  sessionTtlDays: number
  cookieSecure: boolean
  corsOrigin: string
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getConfig(): SisLopeAuthConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for SisLoPe auth functions.')
  }

  const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL)

  return {
    databaseUrl,
    cookieName: process.env.SISLOPE_COOKIE_NAME?.trim() || DEFAULT_COOKIE_NAME,
    sessionTtlDays: parsePositiveInt(process.env.SESSION_TTL_DAYS, DEFAULT_SESSION_TTL_DAYS),
    cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true' || isVercel,
    corsOrigin: process.env.CORS_ORIGIN?.trim() || '*',
  }
}

// ─── Database Pool ──────────────────────────────────────────────────────────

let _pool: pg.Pool | null = null

export function getPool(config: SisLopeAuthConfig): pg.Pool {
  if (!_pool) {
    const needsSsl = config.databaseUrl.includes('sslmode=require') ||
      config.databaseUrl.includes('.neon.tech')
    _pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  }
  return _pool
}

// ─── Token Utilities ────────────────────────────────────────────────────────

export function generateRawToken(): string {
  return randomBytes(48).toString('base64url')
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

// ─── Cookie Helpers (raw ServerResponse) ────────────────────────────────────

export function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const key = pair.slice(0, idx).trim()
    const value = pair.slice(idx + 1).trim()
    if (key) cookies[key] = value
  }
  return cookies
}

export function setSessionCookie(
  res: ServerResponse,
  config: SisLopeAuthConfig,
  rawToken: string,
  expiresAt: string,
) {
  const parts = [
    `${config.cookieName}=${rawToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    config.cookieSecure ? 'Secure' : '',
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ].filter(Boolean)
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: ServerResponse, config: SisLopeAuthConfig) {
  res.setHeader(
    'Set-Cookie',
    `${config.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  )
}

// ─── HTTP Utilities ─────────────────────────────────────────────────────────

export function setCorsHeaders(res: ServerResponse, config: SisLopeAuthConfig) {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export async function readJsonBody<T = unknown>(
  req: { on: (event: string, cb: (chunk: Buffer) => void) => void },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T)
      } catch {
        reject(new Error('INVALID_JSON'))
      }
    })
    req.on('error', reject)
  })
}

export function getIp(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null
  }
  return null
}

// ─── Auth Queries ───────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string
  username: string
  email: string
  role: string
  status: string
  mustChangePassword: boolean
}

interface LoginQueryRow extends AuthenticatedUser {
  passwordHash: string
  passwordMatches: boolean
}

export async function findUserByIdentifier(
  pool: pg.Pool,
  identifier: string,
  password: string,
) {
  const result = await pool.query<LoginQueryRow>(
    `
      SELECT
        id,
        username::text AS username,
        email::text AS email,
        role,
        status,
        must_change_password AS "mustChangePassword",
        password_hash AS "passwordHash",
        password_hash = crypt($2, password_hash) AS "passwordMatches"
      FROM public.usuarios
      WHERE deleted_at IS NULL
        AND (username = $1 OR email = $1)
      LIMIT 1
    `,
    [identifier, password],
  )

  return result.rows[0] ?? null
}

// ─── Account Lockout ────────────────────────────────────────────────────────

interface LockStateRow {
  lockedUntil: string | null
  failedLoginAttempts: number
  status: string
}

export async function getAccountLockState(pool: pg.Pool, userId: string) {
  const result = await pool.query<LockStateRow>(
    `
      SELECT
        locked_until AS "lockedUntil",
        failed_login_attempts AS "failedLoginAttempts",
        status
      FROM public.usuarios
      WHERE id = $1
    `,
    [userId],
  )

  const row = result.rows[0]
  if (!row) {
    return { isLocked: false, lockedUntil: null as Date | null, failedAttempts: 0 }
  }

  const hardLocked = row.status === 'locked'
  const tempLocked = row.lockedUntil !== null && new Date(row.lockedUntil) > new Date()

  return {
    isLocked: hardLocked || tempLocked,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    failedAttempts: row.failedLoginAttempts,
  }
}

interface LockoutUpdateRow {
  failedLoginAttempts: number
  lockedUntil: string | null
}

export async function incrementFailedLoginWithLockout(pool: pg.Pool, userId: string) {
  const result = await pool.query<LockoutUpdateRow>(
    `
      UPDATE public.usuarios
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN (failed_login_attempts + 1) >= $2
            THEN NOW() + make_interval(mins => $3::int)
            ELSE locked_until
          END
      WHERE id = $1
      RETURNING
        failed_login_attempts AS "failedLoginAttempts",
        locked_until AS "lockedUntil"
    `,
    [userId, LOCKOUT_THRESHOLD, LOCKOUT_DURATION_MINUTES],
  )

  const row = result.rows[0]
  const nowLocked =
    (row?.failedLoginAttempts ?? 0) >= LOCKOUT_THRESHOLD && row?.lockedUntil !== null

  return { nowLocked: nowLocked ?? false }
}

// ─── Login Success ──────────────────────────────────────────────────────────

export async function markSuccessfulLogin(
  pool: pg.Pool,
  userId: string,
  ipAddress: string | null,
) {
  await pool.query(
    `
      UPDATE public.usuarios
      SET failed_login_attempts = 0,
          locked_until = NULL,
          last_login_at = NOW(),
          last_login_ip = $2
      WHERE id = $1
    `,
    [userId, ipAddress],
  )
}

// ─── Session Management ─────────────────────────────────────────────────────

interface SessionInsertRow {
  id: string
  expiresAt: string
}

export async function createSession(
  pool: pg.Pool,
  config: SisLopeAuthConfig,
  userId: string,
  refreshTokenHash: string,
  ipAddress: string | null,
  userAgent: string | null,
) {
  const result = await pool.query<SessionInsertRow>(
    `
      INSERT INTO public.auth_sessions (
        user_id,
        refresh_token_hash,
        created_by_ip,
        user_agent,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW() + make_interval(days => $5::int)
      )
      RETURNING id, expires_at AS "expiresAt"
    `,
    [userId, refreshTokenHash, ipAddress, userAgent, config.sessionTtlDays],
  )

  return result.rows[0]
}

interface SessionQueryRow {
  sessionId: string
  refreshTokenHash: string
  expiresAt: string
  id: string
  username: string
  email: string
  role: string
  status: string
  mustChangePassword: boolean
}

export interface AuthSessionContext {
  sessionId: string
  refreshTokenHash: string
  expiresAt: string
  user: AuthenticatedUser
}

export async function getSessionFromCookie(
  pool: pg.Pool,
  cookieName: string,
  cookieHeader: string | undefined,
): Promise<AuthSessionContext | null> {
  const cookies = parseCookieHeader(cookieHeader ?? '')
  const rawToken = cookies[cookieName]
  if (!rawToken) return null

  const refreshTokenHash = hashToken(rawToken)
  const result = await pool.query<SessionQueryRow>(
    `
      SELECT
        s.id AS "sessionId",
        s.refresh_token_hash AS "refreshTokenHash",
        s.expires_at AS "expiresAt",
        u.id,
        u.username::text AS username,
        u.email::text AS email,
        u.role,
        u.status,
        u.must_change_password AS "mustChangePassword"
      FROM public.auth_sessions s
      INNER JOIN public.usuarios u
        ON u.id = s.user_id
      WHERE s.refresh_token_hash = $1
        AND s.session_status = 'active'
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [refreshTokenHash],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    sessionId: row.sessionId,
    refreshTokenHash: row.refreshTokenHash,
    expiresAt: row.expiresAt,
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      mustChangePassword: row.mustChangePassword,
    },
  }
}

export async function updateSessionActivity(pool: pg.Pool, sessionId: string) {
  await pool.query(
    `
      UPDATE public.auth_sessions
      SET last_seen_at = NOW()
      WHERE id = $1
    `,
    [sessionId],
  )
}

export async function revokeSession(
  pool: pg.Pool,
  sessionId: string,
  ipAddress: string | null,
  reason: string,
) {
  await pool.query(
    `
      UPDATE public.auth_sessions
      SET session_status = 'revoked',
          revoked_at = NOW(),
          revoked_by_ip = $2,
          revoke_reason = $3
      WHERE id = $1
    `,
    [sessionId, ipAddress, reason],
  )
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function writeAuditLog(
  pool: pg.Pool,
  options: {
    userId?: string | null
    sessionId?: string | null
    eventType: string
    eventSeverity?: 'info' | 'warning' | 'critical'
    ipAddress?: string | null
    userAgent?: string | null
    payload?: Record<string, unknown>
  },
) {
  try {
    await pool.query(
      `
        INSERT INTO public.auth_audit_log (
          user_id,
          session_id,
          event_type,
          event_severity,
          ip_address,
          user_agent,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        options.userId ?? null,
        options.sessionId ?? null,
        options.eventType,
        options.eventSeverity ?? 'info',
        options.ipAddress ?? null,
        options.userAgent ?? null,
        JSON.stringify({ app: 'sislope', ...(options.payload ?? {}) }),
      ],
    )
  } catch {
    // Audit must not break auth if the table does not exist yet.
  }
}
