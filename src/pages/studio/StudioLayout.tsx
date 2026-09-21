import { type FormEvent, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'

import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useMembership, useSession } from '../../lib/hooks'
import type { Notice } from '../../lib/types'

const studioNav = [
  { label: 'Oversikt', to: '/studio' },
  { label: 'Publisering', to: '/studio/publisering' },
  { label: 'Prosjekter', to: '/studio/prosjekter' },
  { label: 'Oppgaver', to: '/studio/oppgaver' },
  { label: 'Møter', to: '/studio/moter' },
  { label: 'Artikler', to: '/studio/artikler' },
  { label: 'Tjenester', to: '/studio/tjenester' },
  { label: 'Medlemmer', to: '/studio/medlemmer' },
  { label: 'Innstillinger', to: '/studio/innstillinger' },
]

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setPassword('')
    setLoading(false)
    setNotice(
      error
        ? {
            tone: 'error',
            text: 'E-post eller passord stemmer ikke.',
          }
        : { tone: 'success', text: 'Du er logget inn.' },
    )
  }

  return (
    <div className="studio-login">
      <div className="studio-login-card">
        <p className="eyebrow">Secret Pioneers Studio</p>
        <h1>Medlemsinnlogging</h1>
        <p>Logg inn med e-post og passord.</p>
        <form className="auth-form" onSubmit={handlePasswordLogin}>
          <label htmlFor="member-email">E-post</label>
          <input
            autoComplete="email"
            id="member-email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@eksempel.no"
            required
            type="email"
            value={email}
          />
          <label htmlFor="member-password">Passord</label>
          <input
            autoComplete="current-password"
            id="member-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
          <button className="button button-primary" disabled={loading}>
            {loading ? 'Logger inn …' : 'Logg inn'}
          </button>
        </form>
        {notice && (
          <p className={`auth-message ${notice.tone}`} role="status">
            {notice.text}
          </p>
        )}
      </div>
    </div>
  )
}

export default function StudioLayout() {
  const { pathname } = useLocation()
  const { userId, email, loading: sessionLoading } = useSession()
  const { membership, loading: memberLoading } = useMembership(userId)

  if (!isSupabaseConfigured) {
    return (
      <div className="studio-login">
        <div className="studio-login-card">
          <p className="eyebrow">Secret Pioneers Studio</p>
          <h1>Studio kobles til snart.</h1>
          <p>Innlogging er ikke konfigurert i dette lokale miljøet ennå.</p>
          <Link className="text-link" to="/">
            Tilbake til forsiden <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  if (sessionLoading || memberLoading) {
    return (
      <div className="studio-login">
        <div className="studio-login-card">
          <p className="eyebrow">Secret Pioneers Studio</p>
          <h1>Sjekker tilgang …</h1>
          <p>Vi bekrefter medlemskapet ditt.</p>
        </div>
      </div>
    )
  }

  if (!userId || !membership) {
    return <LoginForm />
  }

  if (membership.status !== 'active') {
    return (
      <div className="studio-login">
        <div className="studio-login-card">
          <p className="eyebrow">Secret Pioneers Studio</p>
          <h1>Velkommen, {email}.</h1>
          <p>
            Medlemskapet ditt har status <strong>{membership.status}</strong> og gir
            foreløpig ikke tilgang til arbeidsrommet.
          </p>
          <button
            className="quiet-button"
            onClick={() => void supabase?.auth.signOut()}
          >
            Logg ut
          </button>
        </div>
      </div>
    )
  }

  if (pathname === '/studio/' || pathname === '/studio') {
    return <Navigate to="/studio/oversikt" replace />
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar" aria-label="Studio-navigasjon">
        <Link className="wordmark" to="/" aria-label="Secret Pioneers – hjem">
          <span className="mark" aria-hidden="true">
            SP
          </span>
          Studio
        </Link>
        <nav>
          {studioNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/studio'}
              className={({ isActive }) => (isActive ? 'studio-nav-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="studio-sidebar-footer">
          <span className="studio-user-email">{email}</span>
          <span className="studio-user-role">{membership.role}</span>
          <button
            className="quiet-button"
            onClick={() => void supabase?.auth.signOut()}
          >
            Logg ut
          </button>
        </div>
      </aside>
      <div className="studio-main">
        <Outlet />
      </div>
    </div>
  )
}
