import { useState, type FormEvent } from 'react'
import { ChevronIcon, ShieldIcon } from './Icons'

interface OnboardingProps {
  onRegister: (input: { name: string; phone: string; alias: string; password: string }) => Promise<void>
  onLogin: (input: { phone: string; password: string }) => Promise<void>
  onDemo: () => void
  checking?: boolean
  connectionError?: string
  onRetry: () => void
}

// Local copy of the Logo component since the original Logo is defined in App.tsx and not exported
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} aria-label="PAY, aplicación Yorm">
      {compact ? <span className="brand-mini">PAY</span> : <span className="brand-pay">PAY</span>}
    </div>
  )
}

function Onboarding({
  onRegister,
  onLogin,
  onDemo,
  checking = false,
  connectionError = '',
  onRetry,
}: OnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'register' | 'login'>('welcome')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [providerMessage, setProviderMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (step === 'register') {
        await onRegister({ name: name.trim(), phone: phone.trim(), alias: alias.trim().replace(/^@/, ''), password })
      } else {
        await onLogin({ phone: phone.trim(), password })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProviderClick = (provider: string) => {
    setProviderMessage(`${provider} Sign-In todavía no está conectado en esta versión local.`)
  }

  return (
    <main className="welcome-shell">
      <section className="welcome-art">
        <Logo />
        <div className="welcome-copy">
          <span className="eyebrow light">Wallet de pagos V1</span>
          <h1>
            Muévelo.<br />Págalo.<br />
            <em>Contrólalo.</em>
          </h1>
          <p>Saldo fiat, pagos, cobros, historial y comprobantes en una experiencia simple y trazable.</p>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="security-note">
          <ShieldIcon /> Protección básica para operar con claridad
        </div>
      </section>
      <section className="welcome-panel">
        <div className="mobile-logo">
          <Logo />
        </div>
        {step === 'welcome' ? (
          <div className="auth-box">
            <span className="eyebrow">Bienvenido a Yorm</span>
            <h2>Tu billetera de pagos empieza aquí</h2>
            <p>
              Crea tu cuenta para gestionar saldo fiat, pagos y cobros. Consulta después
              tu historial y comprobantes con trazabilidad clara.
            </p>
            {checking && (
              <div className="connection-note">
                <i /> Verificando tu sesión con la API…
              </div>
            )}
            {connectionError && (
              <div className="form-error api-error">
                {connectionError}
                <button onClick={onRetry}>Reintentar</button>
              </div>
            )}
            {providerMessage && <div className="form-error">{providerMessage}</div>}
            <button
              className="primary-button"
              onClick={() => handleProviderClick('Apple')}
              disabled={checking}
            >
              Iniciar sesión con Apple
            </button>
            <button
              className="primary-button"
              onClick={() => handleProviderClick('Google')}
              disabled={checking}
            >
              Iniciar sesión con Google
            </button>
            <button className="text-button" onClick={onDemo}>
              Explorar versión demo
            </button>
            <div className="demo-caption">
              La demo utiliza fondos simulados. No mueve dinero real.
            </div>
          </div>
        ) : (
          <form className="auth-box" onSubmit={submit}>
            <button type="button" className="back-button" onClick={() => setStep('welcome')}>
              ← Volver
            </button>
            <span className="eyebrow">
              {step === 'register' ? 'Crear cuenta' : 'Acceso seguro'}
            </span>
            <h2>
              {step === 'register' ? 'Cuéntanos sobre ti' : 'Bienvenido de nuevo'}
            </h2>
            <p>
              {step === 'register'
                ? 'Tus datos se registrarán en la API local de Yorm.'
                : 'Ingresa con el celular y la contraseña de tu cuenta.'}
            </p>
            {step === 'register' && (
              <label className="field">
                <span>Nombre completo</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Alex Rivera"
                  autoFocus
                />
              </label>
            )}
            <label className="field">
              <span>Número de celular</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51 999 999 999"
                inputMode="tel"
              />
            </label>
            {step === 'register' && (
              <label className="field">
                <span>YormTag</span>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="alex.yorm"
                  autoCapitalize="none"
                />
              </label>
            )}
            <label className="field">
              <span>Contraseña</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoComplete={step === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button
              className="primary-button"
              type="submit"
              disabled={
                submitting ||
                phone.trim().length < 7 ||
                password.length < 8 ||
                (step === 'register' && (!name.trim() || alias.trim().replace(/^@/, '').length < 3))
              }
            >
              {submitting
                ? 'Conectando…'
                : step === 'register'
                ? 'Crear cuenta'
                : 'Iniciar sesión'}{' '}
              {!submitting && <ChevronIcon />}
            </button>
            <button
              className="secondary-button auth-login-button"
              type="button"
              onClick={() => {
                setError('')
                setStep(step === 'register' ? 'login' : 'register')
              }}
            >
              {step === 'register' ? 'Ya tengo una cuenta' : 'Crear una cuenta'}
            </button>
            <small>
              La autenticación utiliza la API local. No ingreses credenciales
              financieras reales.
            </small>
          </form>
        )}
      </section>
    </main>
  )
}

export default Onboarding