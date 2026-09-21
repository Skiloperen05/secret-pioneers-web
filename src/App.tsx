import { useEffect, useState, type FormEvent } from 'react'

import { isSupabaseConfigured, supabase } from './lib/supabase'

const publicNavigation = ['Prosjekter', 'Tjenester', 'Innsikt', 'Om oss']

type SiteSettings = {
  id: string
  site_title: string
  contact_email: string | null
  hero_copy: string | null
  is_published: boolean
}

type Project = {
  id: string
  title: string
  slug: string
  summary: string | null
  status: string
}

type Membership = {
  role: string
  status: string
}

const fallbackHeroCopy =
  'Secret Pioneers er et rom for ideer, utvikling og verdiskaping – med finans og økonomi som vårt utgangspunkt.'

function App() {
  const [studioOpen, setStudioOpen] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [contentStatus, setContentStatus] = useState<'idle' | 'error'>('idle')
  const [email, setEmail] = useState('')
  const [authStatus, setAuthStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [membership, setMembership] = useState<Membership | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)

  const loadPublicContent = async () => {
    if (!supabase) return

    const [settingsResult, projectsResult] = await Promise.all([
      supabase
        .from('sp_site_settings')
        .select('id, site_title, contact_email, hero_copy, is_published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sp_projects')
        .select('id, title, slug, summary, status')
        .order('published_at', { ascending: false }),
    ])

    if (settingsResult.error || projectsResult.error) {
      setContentStatus('error')
      return
    }

    setSettings(settingsResult.data)
    setProjects(projectsResult.data ?? [])
    setContentStatus('idle')
  }

  useEffect(() => {
    void Promise.resolve().then(loadPublicContent)

    const client = supabase
    if (!client) return

    const channel = client
      .channel('secret-pioneers-public-content')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_site_settings' },
        () => void loadPublicContent(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_projects' },
        () => void loadPublicContent(),
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!studioOpen || !client) return

    let active = true

    const loadMembership = async () => {
      setMemberLoading(true)
      const { data: sessionData } = await client.auth.getSession()
      const user = sessionData.session?.user

      if (!active) return
      if (!user) {
        setMembership(null)
        setMemberEmail('')
        setMemberLoading(false)
        return
      }

      const { data, error } = await client
        .from('sp_memberships')
        .select('role, status')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!active) return
      setMembership(error ? null : data)
      setMemberEmail(user.email ?? '')
      setMemberLoading(false)
    }

    void Promise.resolve().then(loadMembership)
    const { data: listener } = client.auth.onAuthStateChange(() => {
      void loadMembership()
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [studioOpen])

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    setAuthStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    })
    setAuthStatus(error ? 'error' : 'sent')
  }

  const closeStudio = () => {
    setStudioOpen(false)
    setAuthStatus('idle')
  }

  const contactEmail = settings?.contact_email || 'hello@secretpioneers.no'
  const heroCopy = settings?.hero_copy || fallbackHeroCopy

  return (
    <main data-supabase={isSupabaseConfigured ? 'configured' : 'not-configured'}>
      <header className="site-header" aria-label="Hovednavigasjon">
        <a className="wordmark" href="#top" aria-label="Secret Pioneers – hjem">
          <span className="mark" aria-hidden="true">
            SP
          </span>
          {settings?.site_title || 'Secret Pioneers'}
        </a>
        <nav aria-label="Offentlig navigasjon">
          {publicNavigation.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
        <button className="text-button" onClick={() => setStudioOpen(true)}>
          Medlemsinnlogging <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">NHH · Bergen · Etablert 2026</p>
        <h1>
          En ny generasjon
          <br />
          <em>pionerer.</em>
        </h1>
        <p className="hero-copy">{heroCopy}</p>
        <a className="button button-primary" href="#prosjekter">
          Se hva vi bygger <span aria-hidden="true">↓</span>
        </a>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-core" />
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <span className="orbit-star" />
        </div>
      </section>

      <section className="principle" id="prosjekter">
        <p className="eyebrow">Premiss</p>
        <p className="principle-statement">
          Ubegrenset takhøyde for ideer som fortjener å bli undersøkt.
        </p>
        <div className="principle-grid">
          <article>
            <span>01</span>
            <h2>Utforske</h2>
            <p>Vi undersøker muligheter der andre ser avgrensninger.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Utvikle</h2>
            <p>Vi omformer innsikt til konsepter, produkter og samarbeid.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Skape verdi</h2>
            <p>Vi setter prosjekter i bevegelse med nysgjerrighet og presisjon.</p>
          </article>
        </div>
      </section>

      <section className="projects-section" aria-labelledby="projects-title">
        <div className="section-heading">
          <p className="eyebrow">Pågående prosjekter</p>
          <h2 id="projects-title">Prosjekter i bevegelse.</h2>
        </div>
        {projects.length > 0 ? (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <span>
                  {project.status === 'published' ? 'Publisert' : project.status}
                </span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-projects">
            Porteføljen åpner når de første prosjektene er klare for offentligheten.
          </p>
        )}
        {contentStatus === 'error' && (
          <p className="content-note" role="status">
            Innholdet oppdateres. Prøv igjen om et øyeblikk.
          </p>
        )}
      </section>

      <section className="launch-card" id="tjenester">
        <p className="eyebrow">Under utvikling</p>
        <h2>Dette er begynnelsen.</h2>
        <p>
          En selektiv portefølje av prosjekter, digitale løsninger og innsikt lanseres
          her.
        </p>
        <a className="text-link" href={`mailto:${contactEmail}`}>
          Ta kontakt <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer>
        <p>© 2026 Secret Pioneers</p>
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </footer>

      {studioOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="studio-preview"
            aria-labelledby="studio-preview-title"
            role="dialog"
            aria-modal="true"
          >
            <button
              className="close-button"
              onClick={closeStudio}
              aria-label="Lukk Studio"
            >
              ×
            </button>
            <p className="eyebrow">Secret Pioneers Studio</p>
            {!isSupabaseConfigured ? (
              <>
                <h2 id="studio-preview-title">Studio kobles til snart.</h2>
                <p>Innlogging er ikke konfigurert i dette lokale miljøet ennå.</p>
              </>
            ) : memberLoading ? (
              <>
                <h2 id="studio-preview-title">Sjekker tilgang.</h2>
                <p>Vi bekrefter medlemskapet ditt.</p>
              </>
            ) : membership ? (
              <>
                <h2 id="studio-preview-title">Velkommen til Studio.</h2>
                <p>
                  Du er innlogget som {memberEmail || 'medlem'} med rollen{' '}
                  <strong>{membership.role}</strong>.
                </p>
                <p>
                  Publiseringspanelet åpnes for redaktører når første medlemsprofil er
                  aktivert.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => void supabase?.auth.signOut()}
                >
                  Logg ut
                </button>
              </>
            ) : (
              <>
                <h2 id="studio-preview-title">Medlemsinnlogging.</h2>
                <p>
                  Studio er kun for inviterte medlemmer. Skriv inn e-postadressen din,
                  så sender vi en sikker innloggingslenke.
                </p>
                <form className="auth-form" onSubmit={handleMagicLink}>
                  <label htmlFor="member-email">E-post</label>
                  <input
                    autoComplete="email"
                    id="member-email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="navn@eksempel.no"
                    required
                    type="email"
                    value={email}
                  />
                  <button
                    className="button button-primary"
                    disabled={authStatus === 'sending'}
                  >
                    {authStatus === 'sending' ? 'Sender …' : 'Send innloggingslenke'}
                  </button>
                </form>
                {authStatus === 'sent' && (
                  <p className="auth-message success" role="status">
                    Hvis adressen er invitert, ligger lenken i innboksen.
                  </p>
                )}
                {authStatus === 'error' && (
                  <p className="auth-message" role="alert">
                    Vi kunne ikke sende lenken. Kontroller e-postadressen eller prøv
                    igjen.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default App
