import { useEffect, useState, type FormEvent } from 'react'

import { isSupabaseConfigured, supabase } from './lib/supabase'

const publicNavigation = ['Prosjekter', 'Tjenester', 'Innsikt', 'Om oss']
const editorRoles = ['owner', 'admin', 'editor']

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

type StudioProject = Project & {
  visibility: 'internal' | 'private' | 'public'
  is_public: boolean
  published_at: string | null
}

type Membership = { role: string; status: string }
type Notice = { tone: 'error' | 'success'; text: string }

const fallbackHeroCopy =
  'Secret Pioneers er et rom for ideer, utvikling og verdiskaping – med finans og økonomi som vårt utgangspunkt.'

const canEdit = (membership: Membership | null) =>
  Boolean(
    membership &&
    membership.status === 'active' &&
    editorRoles.includes(membership.role),
  )

const createSlug = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('nb-NO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

function App() {
  const [studioOpen, setStudioOpen] = useState(false)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [contentStatus, setContentStatus] = useState<'idle' | 'error'>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authNotice, setAuthNotice] = useState<Notice | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberId, setMemberId] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)
  const [workspaceSettings, setWorkspaceSettings] = useState<SiteSettings | null>(null)
  const [studioProjects, setStudioProjects] = useState<StudioProject[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceNotice, setWorkspaceNotice] = useState<Notice | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectSummary, setProjectSummary] = useState('')
  const [projectPublic, setProjectPublic] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

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
    const loadStudio = async () => {
      setMemberLoading(true)
      const { data: sessionData } = await client.auth.getSession()
      const user = sessionData.session?.user
      if (!active) return
      if (!user) {
        setMembership(null)
        setMemberEmail('')
        setMemberId('')
        setWorkspaceSettings(null)
        setStudioProjects([])
        setMemberLoading(false)
        return
      }
      const { data: membershipData, error: membershipError } = await client
        .from('sp_memberships')
        .select('role, status')
        .eq('profile_id', user.id)
        .maybeSingle()
      if (!active) return
      setMembership(membershipError ? null : membershipData)
      setMemberEmail(user.email ?? '')
      setMemberId(user.id)
      setMemberLoading(false)
      if (!canEdit(membershipData)) return
      setWorkspaceLoading(true)
      const [settingsResult, projectsResult] = await Promise.all([
        client
          .from('sp_site_settings')
          .select('id, site_title, contact_email, hero_copy, is_published')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('sp_projects')
          .select(
            'id, title, slug, summary, status, visibility, is_public, published_at',
          )
          .order('created_at', { ascending: false }),
      ])
      if (!active) return
      setWorkspaceSettings(settingsResult.error ? null : settingsResult.data)
      setStudioProjects(projectsResult.error ? [] : (projectsResult.data ?? []))
      setWorkspaceLoading(false)
    }
    void Promise.resolve().then(loadStudio)
    const { data: listener } = client.auth.onAuthStateChange(() => {
      void loadStudio()
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [studioOpen])

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthLoading(true)
    setAuthNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setPassword('')
    setAuthLoading(false)
    setAuthNotice(
      error
        ? {
            tone: 'error',
            text: 'E-post eller passord stemmer ikke. Bruk innloggingslenke første gang.',
          }
        : { tone: 'success', text: 'Du er logget inn.' },
    )
  }

  const handleMagicLink = async () => {
    if (!supabase || !email) return
    setAuthLoading(true)
    setAuthNotice(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    })
    setAuthLoading(false)
    setAuthNotice(
      error
        ? {
            tone: 'error',
            text: 'Vi kunne ikke sende lenken. Kontroller e-postadressen eller prøv igjen.',
          }
        : {
            tone: 'success',
            text: 'Hvis adressen er invitert, ligger en innloggingslenke i innboksen.',
          },
    )
  }

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    if (newPassword.length < 12) {
      setPasswordNotice({ tone: 'error', text: 'Velg minst 12 tegn i passordet.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ tone: 'error', text: 'Passordene er ikke like.' })
      return
    }
    setSavingPassword(true)
    setPasswordNotice(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordNotice(
      error
        ? { tone: 'error', text: 'Passordet kunne ikke lagres. Prøv igjen.' }
        : {
            tone: 'success',
            text: 'Passordet er lagret. Neste gang kan du logge inn direkte.',
          },
    )
  }

  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !workspaceSettings || !canEdit(membership)) return
    setSavingSettings(true)
    setWorkspaceNotice(null)
    const { error } = await supabase
      .from('sp_site_settings')
      .update({
        site_title: workspaceSettings.site_title.trim(),
        contact_email: workspaceSettings.contact_email?.trim() || null,
        hero_copy: workspaceSettings.hero_copy?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceSettings.id)
    setSavingSettings(false)
    if (error) {
      setWorkspaceNotice({ tone: 'error', text: 'Endringene kunne ikke lagres.' })
      return
    }
    setWorkspaceNotice({ tone: 'success', text: 'Forsiden er oppdatert.' })
    void loadPublicContent()
  }

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !memberId || !canEdit(membership)) return
    const title = projectTitle.trim()
    const slug = createSlug(title)
    if (!title || !slug) {
      setWorkspaceNotice({
        tone: 'error',
        text: 'Prosjektet trenger en gyldig tittel.',
      })
      return
    }
    setSavingProject(true)
    setWorkspaceNotice(null)
    const { error } = await supabase.from('sp_projects').insert({
      title,
      slug,
      summary: projectSummary.trim() || null,
      visibility: projectPublic ? 'public' : 'internal',
      status: projectPublic ? 'published' : 'draft',
      is_public: projectPublic,
      published_at: projectPublic ? new Date().toISOString() : null,
      owner_id: memberId,
    })
    setSavingProject(false)
    if (error) {
      setWorkspaceNotice({
        tone: 'error',
        text: 'Prosjektet kunne ikke opprettes. Prøv en mer særpreget tittel.',
      })
      return
    }
    setProjectTitle('')
    setProjectSummary('')
    setProjectPublic(false)
    setWorkspaceNotice({
      tone: 'success',
      text: projectPublic
        ? 'Prosjektet er publisert på forsiden.'
        : 'Internt prosjekt er opprettet.',
    })
    void loadPublicContent()
    const { data } = await supabase
      .from('sp_projects')
      .select('id, title, slug, summary, status, visibility, is_public, published_at')
      .order('created_at', { ascending: false })
    setStudioProjects(data ?? [])
  }

  const closeStudio = () => {
    setStudioOpen(false)
    setAuthNotice(null)
    setWorkspaceNotice(null)
  }
  const contactEmail = settings?.contact_email || 'hello@secretpioneers.no'
  const heroCopy = settings?.hero_copy || fallbackHeroCopy
  const hasEditorAccess = canEdit(membership)

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
            className={`studio-preview ${hasEditorAccess ? 'studio-workspace' : ''}`}
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
                <div className="studio-welcome">
                  <div>
                    <h2 id="studio-preview-title">Velkommen til Studio.</h2>
                    <p>
                      Du er innlogget som {memberEmail || 'medlem'} med rollen{' '}
                      <strong>{membership.role}</strong>.
                    </p>
                  </div>
                  <button
                    className="quiet-button"
                    onClick={() => void supabase?.auth.signOut()}
                  >
                    Logg ut
                  </button>
                </div>
                {hasEditorAccess ? (
                  <div className="studio-grid">
                    <section className="studio-panel">
                      <p className="eyebrow">Publisering</p>
                      <h3>Rediger forsiden</h3>
                      {workspaceLoading || !workspaceSettings ? (
                        <p>Henter innholdet …</p>
                      ) : (
                        <form className="auth-form" onSubmit={handleSaveSettings}>
                          <label htmlFor="site-title">Navn på nettstedet</label>
                          <input
                            id="site-title"
                            onChange={(event) =>
                              setWorkspaceSettings({
                                ...workspaceSettings,
                                site_title: event.target.value,
                              })
                            }
                            required
                            value={workspaceSettings.site_title}
                          />
                          <label htmlFor="contact-email">Kontaktadresse</label>
                          <input
                            id="contact-email"
                            onChange={(event) =>
                              setWorkspaceSettings({
                                ...workspaceSettings,
                                contact_email: event.target.value,
                              })
                            }
                            type="email"
                            value={workspaceSettings.contact_email ?? ''}
                          />
                          <label htmlFor="hero-copy">Introduksjon</label>
                          <textarea
                            id="hero-copy"
                            onChange={(event) =>
                              setWorkspaceSettings({
                                ...workspaceSettings,
                                hero_copy: event.target.value,
                              })
                            }
                            rows={5}
                            value={workspaceSettings.hero_copy ?? ''}
                          />
                          <button
                            className="button button-primary"
                            disabled={savingSettings}
                          >
                            {savingSettings ? 'Lagrer …' : 'Publiser endringer'}
                          </button>
                        </form>
                      )}
                    </section>
                    <section className="studio-panel">
                      <p className="eyebrow">Portefølje</p>
                      <h3>Opprett prosjekt</h3>
                      <form className="auth-form" onSubmit={handleCreateProject}>
                        <label htmlFor="project-title">Prosjektnavn</label>
                        <input
                          id="project-title"
                          maxLength={160}
                          onChange={(event) => setProjectTitle(event.target.value)}
                          required
                          value={projectTitle}
                        />
                        <label htmlFor="project-summary">Kort beskrivelse</label>
                        <textarea
                          id="project-summary"
                          maxLength={1000}
                          onChange={(event) => setProjectSummary(event.target.value)}
                          rows={5}
                          value={projectSummary}
                        />
                        <label className="check-label" htmlFor="project-public">
                          <input
                            checked={projectPublic}
                            id="project-public"
                            onChange={(event) => setProjectPublic(event.target.checked)}
                            type="checkbox"
                          />
                          Publiser på den åpne nettsiden nå
                        </label>
                        <button
                          className="button button-primary"
                          disabled={savingProject}
                        >
                          {savingProject ? 'Oppretter …' : 'Opprett prosjekt'}
                        </button>
                      </form>
                    </section>
                    <section className="studio-panel studio-panel-wide">
                      <p className="eyebrow">Arbeidsrom</p>
                      <h3>Prosjektoversikt</h3>
                      {studioProjects.length === 0 ? (
                        <p>Ingen prosjekter ennå.</p>
                      ) : (
                        <ul className="studio-project-list">
                          {studioProjects.map((project) => (
                            <li key={project.id}>
                              <div>
                                <strong>{project.title}</strong>
                                <span>{project.summary || 'Ingen beskrivelse'}</span>
                              </div>
                              <span>
                                {project.is_public ? 'Offentlig' : 'Internt'} ·{' '}
                                {project.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className="studio-panel studio-panel-wide">
                      <p className="eyebrow">Sikkerhet</p>
                      <h3>Opprett eller bytt passord</h3>
                      <p>
                        Da kan du logge inn direkte neste gang. Passordet lagres bare
                        hos Supabase – aldri i nettstedet eller GitHub.
                      </p>
                      <form className="auth-form" onSubmit={handleSetPassword}>
                        <label htmlFor="new-password">Nytt passord</label>
                        <input
                          autoComplete="new-password"
                          id="new-password"
                          minLength={12}
                          onChange={(event) => setNewPassword(event.target.value)}
                          required
                          type="password"
                          value={newPassword}
                        />
                        <label htmlFor="confirm-password">Gjenta passordet</label>
                        <input
                          autoComplete="new-password"
                          id="confirm-password"
                          minLength={12}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          required
                          type="password"
                          value={confirmPassword}
                        />
                        <button
                          className="button button-primary"
                          disabled={savingPassword}
                        >
                          {savingPassword ? 'Lagrer …' : 'Lagre passord'}
                        </button>
                      </form>
                      {passwordNotice && (
                        <p
                          className={`auth-message ${passwordNotice.tone}`}
                          role="status"
                        >
                          {passwordNotice.text}
                        </p>
                      )}
                    </section>
                    {workspaceNotice && (
                      <p
                        className={`auth-message ${workspaceNotice.tone}`}
                        role="status"
                      >
                        {workspaceNotice.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>
                    Medlemskapet ditt er aktivt, men denne rollen har foreløpig ikke
                    redaktørtilgang.
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 id="studio-preview-title">Medlemsinnlogging.</h2>
                <p>
                  Logg inn med e-post og passord. Første gang kan du bruke en
                  innloggingslenke, og deretter opprette et eget passord i Studio.
                </p>
                <form className="auth-form" onSubmit={handlePasswordLogin}>
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
                  <label htmlFor="member-password">Passord</label>
                  <input
                    autoComplete="current-password"
                    id="member-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                  <button className="button button-primary" disabled={authLoading}>
                    {authLoading ? 'Logger inn …' : 'Logg inn'}
                  </button>
                </form>
                <button
                  className="quiet-button magic-link-button"
                  disabled={authLoading || !email}
                  onClick={() => void handleMagicLink()}
                >
                  Bruk innloggingslenke i stedet
                </button>
                {authNotice && (
                  <p className={`auth-message ${authNotice.tone}`} role="status">
                    {authNotice.text}
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
