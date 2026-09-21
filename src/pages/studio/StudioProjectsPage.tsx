import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { createSlug, useSession } from '../../lib/hooks'
import type { Notice, StudioProject } from '../../lib/types'

export default function StudioProjectsPage() {
  const { userId } = useSession()
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const loadProjects = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_projects')
      .select(
        'id, title, slug, summary, status, visibility, is_public, published_at, cover_image_path',
      )
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects((data as StudioProject[]) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (userId) loadProjects()
  }, [userId, loadProjects])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !userId) return
    const trimmed = title.trim()
    const slug = createSlug(trimmed)
    if (!trimmed || !slug) {
      setNotice({ tone: 'error', text: 'Prosjektet trenger en gyldig tittel.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.from('sp_projects').insert({
      title: trimmed,
      slug,
      summary: summary.trim() || null,
      visibility: isPublic ? 'public' : 'internal',
      status: isPublic ? 'published' : 'draft',
      is_public: isPublic,
      published_at: isPublic ? new Date().toISOString() : null,
      owner_id: userId,
    })
    setSaving(false)
    if (error) {
      setNotice({
        tone: 'error',
        text: 'Prosjektet kunne ikke opprettes. Prøv en mer særpreget tittel.',
      })
      return
    }
    setTitle('')
    setSummary('')
    setIsPublic(false)
    setNotice({
      tone: 'success',
      text: isPublic
        ? 'Prosjektet er publisert på forsiden.'
        : 'Internt prosjekt er opprettet.',
    })
    void loadProjects()
  }

  const togglePublish = async (project: StudioProject) => {
    if (!supabase) return
    const willPublish = !project.is_public
    const { error } = await supabase
      .from('sp_projects')
      .update({
        visibility: willPublish ? 'public' : 'internal',
        status: willPublish ? 'published' : 'draft',
        is_public: willPublish,
        published_at: willPublish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
    if (error) {
      setNotice({ tone: 'error', text: 'Statusen kunne ikke endres.' })
      return
    }
    setNotice({
      tone: 'success',
      text: willPublish ? 'Prosjektet er publisert.' : 'Prosjektet er avpublisert.',
    })
    void loadProjects()
  }

  const handleImageUpload = async (projectId: string, slug: string) => {
    if (!supabase || !imageFile) return
    setUploadingFor(projectId)
    const ext = imageFile.name.split('.').pop() ?? 'jpg'
    const path = `projects/${slug}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('sp-media')
      .upload(path, imageFile, { upsert: true })
    if (uploadError) {
      setNotice({ tone: 'error', text: 'Bildet kunne ikke lastes opp.' })
      setUploadingFor(null)
      return
    }
    const { error: updateError } = await supabase
      .from('sp_projects')
      .update({ cover_image_path: path, updated_at: new Date().toISOString() })
      .eq('id', projectId)
    setUploadingFor(null)
    setImageFile(null)
    if (updateError) {
      setNotice({
        tone: 'error',
        text: 'Bilde lastet opp, men prosjektet ble ikke oppdatert.',
      })
      return
    }
    setNotice({ tone: 'success', text: 'Forsidebilde lastet opp.' })
    void loadProjects()
  }

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Portefølje</p>
        <h1>Prosjekter</h1>
      </div>

      <section className="studio-card">
        <h2>Opprett nytt prosjekt</h2>
        <form className="studio-form" onSubmit={handleCreate}>
          <label htmlFor="project-title">Prosjektnavn</label>
          <input
            id="project-title"
            maxLength={160}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="project-summary">Kort beskrivelse</label>
          <textarea
            id="project-summary"
            maxLength={1000}
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <label className="check-label" htmlFor="project-public">
            <input
              checked={isPublic}
              id="project-public"
              type="checkbox"
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Publiser på den åpne nettsiden nå
          </label>
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Oppretter …' : 'Opprett prosjekt'}
          </button>
        </form>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="studio-card">
        <h2>Alle prosjekter</h2>
        {loading ? (
          <p className="loading-text">Henter prosjekter …</p>
        ) : projects.length === 0 ? (
          <p>Ingen prosjekter ennå.</p>
        ) : (
          <ul className="studio-project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.summary || 'Ingen beskrivelse'}</span>
                  {project.cover_image_path && (
                    <span className="studio-meta">
                      Bilde: {project.cover_image_path}
                    </span>
                  )}
                </div>
                <div className="studio-project-actions">
                  <span>
                    {project.is_public ? 'Offentlig' : 'Internt'} · {project.status}
                  </span>
                  <button
                    className="quiet-button"
                    onClick={() => void togglePublish(project)}
                  >
                    {project.is_public ? 'Avpubliser' : 'Publiser'}
                  </button>
                  <div className="image-upload-row">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      className="quiet-button"
                      disabled={!imageFile || uploadingFor === project.id}
                      onClick={() => void handleImageUpload(project.id, project.slug)}
                    >
                      {uploadingFor === project.id ? 'Laster opp …' : 'Last opp bilde'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
