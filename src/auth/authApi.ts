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

let accessToken: string | null = null
let refreshToken: string | null = null

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
