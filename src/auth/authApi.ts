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

async function readErrorPayload(response: Response): Promise<{ error?: string }> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return {}
  try {
    return (await response.json()) as { error?: string }
  } catch {
    return {}
  }
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
      'Sin conexión con el servidor. Intenta nuevamente en unos segundos.',
      0,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    const code = payload.error ?? 'HTTP_ERROR'
    const message =
      code === 'INVALID_CREDENTIALS'
        ? 'Correo o contraseña incorrectos.'
        : code === 'ACCOUNT_LOCKED'
          ? 'Cuenta bloqueada por múltiples intentos fallidos. Intenta en 15 minutos.'
          : code === 'MISSING_CREDENTIALS'
            ? 'Ingresa tu correo y contraseña.'
            : 'No se pudo completar la solicitud.'

    throw new AuthApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function fetchCurrentSession() {
  return requestJson<AuthSessionPayload>('/api/auth/me', { method: 'GET' })
}

export function loginWithPassword(identifier: string, password: string) {
  return requestJson<AuthSessionPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function logoutSession() {
  return requestJson<void>('/api/auth/logout', { method: 'POST' })
}
