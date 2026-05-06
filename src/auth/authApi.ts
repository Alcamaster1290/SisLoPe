export interface AuthUser {
  id: string
  username: string
  email: string
  role: string
  status: string
  mustChangePassword: boolean
}

export interface AuthSessionPayload {
  user: AuthUser
  session: {
    id: string
    expiresAt: string
  }
  accessToken?: string | null
}

export class AuthApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

interface DataTradeUser {
  id: string
  email: string
  username: string | null
  displayName?: string | null
  status?: string | null
  roles?: string[]
}

interface DataTradeAuthResponse {
  user: DataTradeUser
  session: {
    id: string
    expiresAt: string
  }
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  accessTokenExpiresAt: string
}

interface ErrorPayload {
  error?: string | {
    code?: string
    message?: string
  }
  message?: string
}

const DATA_TRADE_API_URL = normalizeApiUrl(import.meta.env.VITE_DATA_TRADE_API_URL)
const DATA_TRADE_TRACKING_ENABLED = parseBooleanFlag(import.meta.env.VITE_DATA_TRADE_TRACKING_ENABLED)
const DATA_TRADE_MODULE_CODE = import.meta.env.VITE_DATA_TRADE_MODULE_CODE?.trim() || 'sislope'
const ANONYMOUS_ID_STORAGE_KEY = 'sislope_data_trade_anonymous_id'
const SENSITIVE_METADATA_KEYS = new Set([
  'authorization',
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'user_id',
  'userId',
])

let accessToken: string | null = null
let refreshToken: string | null = null

function parseBooleanFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1'
}

function normalizeApiUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '')
}

function buildDataTradeUrl(path: string): string {
  if (!DATA_TRADE_API_URL) {
    throw new AuthApiError(
      'Configura VITE_DATA_TRADE_API_URL para recibir sesiones compartidas.',
      0,
      'DATA_TRADE_API_URL_MISSING',
    )
  }

  return `${DATA_TRADE_API_URL}${path}`
}

function mapDataTradeUser(user: DataTradeUser): AuthUser {
  const roles = user.roles ?? []

  return {
    id: user.id,
    email: user.email,
    username: user.username?.trim() || user.email,
    role: roles.includes('admin') ? 'admin' : 'user',
    status: user.status || 'active',
    mustChangePassword: false,
  }
}

function applyDataTradeAuthResponse(response: DataTradeAuthResponse): AuthSessionPayload {
  accessToken = response.accessToken
  refreshToken = response.refreshToken

  return {
    user: mapDataTradeUser(response.user),
    session: response.session,
    accessToken,
  }
}

export function clearDataTradeSession() {
  accessToken = null
  refreshToken = null
}

export function getDataTradeAccessToken() {
  return accessToken
}

function createAnonymousId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

function getAnonymousId() {
  try {
    const stored = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY)
    if (stored) {
      return stored
    }

    const next = createAnonymousId()
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, next)
    return next
  } catch {
    return createAnonymousId()
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> = {}) {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata).slice(0, 20)) {
    if (SENSITIVE_METADATA_KEYS.has(key)) {
      continue
    }

    if (typeof value === 'string') {
      sanitized[key.slice(0, 120)] = value.slice(0, 500)
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[key.slice(0, 120)] = value
    }
  }

  return sanitized
}

async function readErrorPayload(response: Response): Promise<ErrorPayload> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return {}
  try {
    return (await response.json()) as ErrorPayload
  } catch {
    return {}
  }
}

function getErrorCode(payload: ErrorPayload) {
  if (typeof payload.error === 'string') {
    return payload.error
  }

  return payload.error?.code ?? 'HTTP_ERROR'
}

function getErrorMessage(payload: ErrorPayload, code: string) {
  if (code === 'INVALID_CREDENTIALS') {
    return 'Correo o contrasena incorrectos.'
  }
  if (code === 'ACCOUNT_LOCKED') {
    return 'Cuenta bloqueada por multiples intentos fallidos. Intenta en 15 minutos.'
  }
  if (code === 'MISSING_CREDENTIALS') {
    return 'Ingresa tu correo y contrasena.'
  }

  return (
    (typeof payload.error === 'object' ? payload.error.message : undefined) ??
    payload.message ??
    (typeof payload.error === 'string' ? payload.error : undefined) ??
    'No se pudo completar la solicitud.'
  )
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch {
    throw new AuthApiError(
      'Sin conexion con el servidor. Intenta nuevamente en unos segundos.',
      0,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    const code = getErrorCode(payload)
    throw new AuthApiError(getErrorMessage(payload, code), response.status, code)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function requestDataTradeJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(buildDataTradeUrl(path), {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch {
    throw new AuthApiError(
      'Sin conexion con Data Trade. Intenta nuevamente en unos segundos.',
      0,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    const code = getErrorCode(payload)
    throw new AuthApiError(getErrorMessage(payload, code), response.status, code)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function fetchCurrentSession() {
  if (accessToken) {
    return requestDataTradeJson<{ user: DataTradeUser; session: AuthSessionPayload['session'] }>('/auth/me', {
      method: 'GET',
    }).then((response) => ({
      user: mapDataTradeUser(response.user),
      session: response.session,
      accessToken,
    }))
  }

  return requestJson<AuthSessionPayload>('/api/auth/me', { method: 'GET' })
}

export function loginWithPassword(identifier: string, password: string) {
  return requestJson<AuthSessionPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export async function exchangeHandoffCode(code: string, targetModule = 'sislope') {
  const response = await requestDataTradeJson<DataTradeAuthResponse>('/auth/handoff/exchange', {
    method: 'POST',
    body: JSON.stringify({
      code,
      targetModule,
    }),
  })

  return applyDataTradeAuthResponse(response)
}

export async function trackDataTradeEvent(
  eventName: 'module_opened' | 'session_started',
  metadata: Record<string, unknown> = {},
) {
  if (!DATA_TRADE_TRACKING_ENABLED || !DATA_TRADE_API_URL) {
    return { sent: false as const, reason: 'disabled' as const }
  }

  const body: Record<string, unknown> = {
    module: DATA_TRADE_MODULE_CODE,
    eventName,
    metadata: sanitizeMetadata(metadata),
    path: window.location.pathname,
  }

  if (!accessToken) {
    body.anonymousId = getAnonymousId()
  }

  try {
    await requestDataTradeJson<void>('/events/track', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return { sent: true as const }
  } catch {
    return { sent: false as const, reason: 'api_error' as const }
  }
}

export async function logoutSession() {
  if (accessToken || refreshToken) {
    try {
      await requestDataTradeJson<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      })
    } finally {
      clearDataTradeSession()
    }
    return
  }

  return requestJson<void>('/api/auth/logout', { method: 'POST' })
}
