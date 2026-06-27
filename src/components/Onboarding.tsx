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
    <div className={`brand ${compact ? 'compact' : ''}`} aria-label="ionPAY">
      {compact ? (
        <span className="brand-mini">i<span>PAY</span></span>
      ) : (
        <>
          <span className="brand-ion">ion</span>
          <span className="brand-pay">PAY</span>
        </>
      )}
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
    <main className="welcome-shell issue30-onboarding">
      <style>{onboardingVisualStyles}</style>
      <section className="welcome-art issue30-welcome-art">
        <Logo />
        <div className="welcome-copy issue30-welcome-copy">
          <span className="eyebrow light">Wallet V1 · PEN only</span>
          <h1>
            Paga.<br />Recibe.<br />
            <em>Confirma.</em>
          </h1>
          <p>Una superficie blanca/negra con acento lime para saldo PEN, pagos, cobros, activity y receipts internos.</p>
          <div className="issue30-visual-pills" aria-label="Alcance V1">
            <span>PEN V1</span>
            <span>Activity proof</span>
            <span>Demo simulada</span>
          </div>
        </div>
        <div className="issue30-balance-preview" aria-hidden="true">
          <span>Vista previa de saldo</span>
          <strong>S/ 0.00</strong>
          <small>Demo/API local · no producción</small>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="security-note">
          <ShieldIcon /> Protección básica para operar con claridad
        </div>
      </section>
      <section className="welcome-panel issue30-welcome-panel">
        <div className="mobile-logo">
          <Logo />
        </div>
        {step === 'welcome' ? (
          <div className="auth-box issue30-auth-box">
            <span className="eyebrow">Bienvenido a ionPAY</span>
            <h2>Tu billetera empieza aquí</h2>
            <p>
              Entra a la versión local para revisar saldo PEN, requests, activity y receipts internos sin producción ni dinero real.
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
              className="primary-button issue30-provider-button"
              onClick={() => handleProviderClick('Apple')}
              disabled={checking}
            >
              Iniciar sesión con Apple
            </button>
            <button
              className="secondary-button issue30-provider-button"
              onClick={() => handleProviderClick('Google')}
              disabled={checking}
            >
              Iniciar sesión con Google
            </button>
            <button className="text-button" onClick={onDemo}>
              Explorar versión demo
            </button>
            <div className="demo-caption issue30-demo-caption">
              Demo local con fondos simulados. No mueve dinero real ni autoriza producción.
            </div>
          </div>
        ) : (
          <form className="auth-box issue30-auth-box" onSubmit={submit}>
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
                ? 'Tus datos se registrarán en la API local de ionPAY.'
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
                <span>IonTag</span>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="alex.ion"
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

const onboardingVisualStyles = `
.issue30-onboarding {
  background: #ffffff;
}
.issue30-welcome-art {
  background: radial-gradient(circle at 84% 16%, rgba(168, 240, 47, .16), transparent 30%), linear-gradient(145deg, #050606 12%, #101211 68%, #171b18 118%);
}
.issue30-welcome-art .brand-ion,
.issue30-welcome-art .brand-pay {
  letter-spacing: -2.4px;
}
.issue30-welcome-copy h1 {
  max-width: 680px;
  font-weight: 900;
  letter-spacing: -5.8px;
}
.issue30-welcome-copy p {
  max-width: 500px;
  color: #c7d0cc;
}
.issue30-visual-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}
.issue30-visual-pills span {
  padding: 8px 11px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 999px;
  color: #e9efe8;
  background: rgba(255,255,255,.05);
  font-size: 10px;
  font-weight: 900;
}
.issue30-balance-preview {
  width: min(335px, 100%);
  display: grid;
  gap: 7px;
  margin: 30px 0 34px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, rgba(255,255,255,.09), rgba(255,255,255,.03));
  box-shadow: 0 24px 60px rgba(0,0,0,.18);
}
.issue30-balance-preview span,
.issue30-balance-preview small {
  color: #aab5b1;
  font-size: 10px;
}
.issue30-balance-preview strong {
  color: var(--lime);
  font: 900 34px/1 'Manrope', system-ui, sans-serif;
  letter-spacing: -1.4px;
}
.issue30-welcome-panel {
  background: #fff;
}
.issue30-auth-box {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 20px 55px rgba(16, 24, 20, .07);
}
.issue30-auth-box h2 {
  font-size: 36px;
  letter-spacing: -1.8px;
}
.issue30-provider-button {
  margin-bottom: 10px;
  border-radius: 17px;
}
.issue30-demo-caption {
  color: #6f7773;
  line-height: 1.45;
}
@media (max-width: 820px) {
  .issue30-onboarding {
    display: block;
    min-height: 100vh;
    background: #fff;
  }
  .issue30-welcome-art {
    min-height: auto;
    padding: calc(28px + env(safe-area-inset-top)) 24px 22px;
    border-radius: 0 0 34px 34px;
  }
  .issue30-welcome-copy {
    margin: 42px 0 0;
  }
  .issue30-welcome-copy h1 {
    margin: 12px 0 12px;
    font-size: 46px;
    letter-spacing: -3.5px;
  }
  .issue30-welcome-copy p {
    font-size: 13px;
    line-height: 1.45;
  }
  .issue30-balance-preview {
    margin: 20px 0 0;
    padding: 16px;
    border-radius: 20px;
  }
  .issue30-balance-preview strong {
    font-size: 30px;
  }
  .issue30-welcome-panel {
    display: block;
    padding: 18px 18px calc(24px + env(safe-area-inset-bottom));
  }
  .issue30-auth-box {
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .issue30-auth-box h2 {
    margin: 10px 0;
    font-size: 27px;
    letter-spacing: -1px;
  }
  .issue30-auth-box > p {
    margin-bottom: 18px;
    font-size: 12px;
    line-height: 1.45;
  }
}
`

export default Onboarding