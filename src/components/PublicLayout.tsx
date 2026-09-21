import { Link, Outlet, useLocation } from 'react-router-dom'

import { usePublicSettings } from '../lib/usePublicData'

const navigation = [
  { label: 'Prosjekter', to: '/prosjekter' },
  { label: 'Tjenester', to: '/tjenester' },
  { label: 'Innsikt', to: '/innsikt' },
  { label: 'Om oss', to: '/om-oss' },
  { label: 'Kontakt', to: '/kontakt' },
]

export default function PublicLayout() {
  const { pathname } = useLocation()
  const { settings } = usePublicSettings()
  const contactEmail = settings?.contact_email || 'hello@secretpioneers.no'

  return (
    <>
      <header className="site-header" aria-label="Hovednavigasjon">
        <Link className="wordmark" to="/" aria-label="Secret Pioneers – hjem">
          <span className="mark" aria-hidden="true">
            SP
          </span>
          {settings?.site_title || 'Secret Pioneers'}
        </Link>
        <nav aria-label="Offentlig navigasjon">
          {navigation.map((item) => (
            <Link
              to={item.to}
              key={item.to}
              className={pathname === item.to ? 'nav-active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="text-button" to="/studio">
          Medlemsinnlogging <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <Outlet />

      <footer>
        <p>© 2026 Secret Pioneers</p>
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </footer>
    </>
  )
}
