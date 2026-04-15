import { useState } from 'react'
import { loginWithPassword, AuthApiError } from './authApi'
import { useAuth } from './AuthContext'

const ADEX_REGISTER_URL =
  import.meta.env.VITE_ADEX_URL?.trim() || 'https://adex-palletizer.vercel.app'

export function AuthScreen() {
  const { recheck } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await loginWithPassword(trimmedEmail, password)
      recheck()
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : 'Error al iniciar sesión. Intenta nuevamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface-2)',
          border: '1px solid var(--surface-border)',
          borderRadius: 16,
          padding: '2.5rem 2rem 2rem',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Header */}
        <p
          style={{
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-soft)',
            marginBottom: '0.25rem',
          }}
        >
          SISTEMA LOGISTICO PERUANO
        </p>

        <h1
          style={{
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: 700,
            fontSize: '1.65rem',
            lineHeight: 1.15,
            color: 'var(--text-strong)',
            margin: '0 0 0.5rem',
          }}
        >
          Inicia sesión
        </h1>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-soft)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          Usa las credenciales de tu cuenta en{' '}
          <strong style={{ color: 'var(--text-main)' }}>ADEX Palletizer</strong> para acceder al
          mapa logístico.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="sislope-email"
            style={{
              display: 'block',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.3rem',
              }}
            >
              Correo o usuario
            </span>
            <input
              id="sislope-email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              autoComplete="username"
              placeholder="nombre@empresa.com"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                background: 'var(--control-bg)',
                border: '1px solid var(--control-border)',
                borderRadius: 8,
                color: 'var(--text-strong)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label
            htmlFor="sislope-password"
            style={{
              display: 'block',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.3rem',
              }}
            >
              Contraseña
            </span>
            <input
              id="sislope-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                background: 'var(--control-bg)',
                border: '1px solid var(--control-border)',
                borderRadius: 8,
                color: 'var(--text-strong)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {/* Error message */}
          {error ? (
            <div
              role="alert"
              style={{
                background: 'rgba(200, 40, 40, 0.1)',
                border: '1px solid rgba(200, 40, 40, 0.25)',
                borderRadius: 8,
                padding: '0.6rem 0.75rem',
                fontSize: '0.82rem',
                color: '#c62828',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.7rem',
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '0.04em',
              color: '#fff',
              background: submitting ? 'rgba(146, 30, 30, 0.5)' : 'rgba(146, 30, 30, 0.88)',
              border: 'none',
              borderRadius: 10,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              marginBottom: '1rem',
            }}
          >
            {submitting ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Register CTA */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--surface-border)',
          }}
        >
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-soft)',
              marginBottom: '0.4rem',
            }}
          >
            ¿No tienes cuenta?
          </p>
          <a
            href={ADEX_REGISTER_URL}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'inline-block',
              width: '100%',
              padding: '0.55rem 0.75rem',
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 700,
              fontSize: '0.88rem',
              color: 'rgba(146, 30, 30, 0.9)',
              textDecoration: 'none',
              letterSpacing: '0.02em',
              border: '1px solid rgba(146, 30, 30, 0.2)',
              borderRadius: 10,
              transition: 'background 0.15s',
            }}
          >
            Crear cuenta en ADEX Palletizer
          </a>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-soft)',
              marginTop: '0.5rem',
              lineHeight: 1.45,
            }}
          >
            Tu cuenta da acceso a todo el ecosistema: Palletizer, Expediente de Costos y SisLoPe.
          </p>
        </div>
      </section>
    </main>
  )
}
