import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { createSlug, useSession } from '../../lib/hooks'
import type {
  Notice,
  Profile,
  ProjectDocument,
  ProjectMember,
  StudioProject,
} from '../../lib/types'

export default function StudioProjectsPage() {
  const { userId } = useSession()
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [visibility, setVisibility] = useState<'internal' | 'private' | 'public'>(
    'internal',
  )
  const [saving, setSaving] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [uploadingDocumentFor, setUploadingDocumentFor] = useState<string | null>(null)

  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [projectMembers, setProjectMembers] = useState<Map<string, ProjectMember[]>>(
    new Map(),
  )
  const [projectDocuments, setProjectDocuments] = useState<
    Map<string, ProjectDocument[]>
  >(new Map())
  const [addMemberProject, setAddMemberProject] = useState<string | null>(null)
  const [addMemberProfile, setAddMemberProfile] = useState('')
  const [addMemberRole, setAddMemberRole] = useState('member')

  const loadProjects = useCallback(() => {
    const client = supabase
    if (!client) return
    void Promise.all([
      client
        .from('sp_projects')
        .select(
          'id, title, slug, summary, status, visibility, is_public, published_at, cover_image_path',
        )
        .order('created_at', { ascending: false }),
      client.from('sp_profiles').select('id, display_name, avatar_path, bio'),
      client.from('sp_project_members').select('id, project_id, profile_id, role'),
      client
        .from('sp_project_documents')
        .select(
          'id, project_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at',
        )
        .order('created_at', { ascending: false }),
    ]).then(([projRes, profRes, pmRes, documentRes]) => {
      setProjects((projRes.data as StudioProject[]) ?? [])
      setAllProfiles(profRes.data ?? [])
      const pmMap = new Map<string, ProjectMember[]>()
      const profMap = new Map((profRes.data ?? []).map((p) => [p.id, p]))
      for (const pm of pmRes.data ?? []) {
        const list = pmMap.get(pm.project_id) ?? []
        list.push({ ...pm, profile: profMap.get(pm.profile_id) })
        pmMap.set(pm.project_id, list)
      }
      setProjectMembers(pmMap)
      const documentMap = new Map<string, ProjectDocument[]>()
      for (const document of (documentRes.data ?? []) as ProjectDocument[]) {
        const list = documentMap.get(document.project_id) ?? []
        list.push(document)
        documentMap.set(document.project_id, list)
      }
      setProjectDocuments(documentMap)
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
      visibility,
      status: visibility === 'public' ? 'published' : 'draft',
      is_public: visibility === 'public',
      published_at: visibility === 'public' ? new Date().toISOString() : null,
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
    setVisibility('internal')
    setNotice({
      tone: 'success',
      text:
        visibility === 'public'
          ? 'Prosjektet er publisert på forsiden.'
          : 'Internt prosjekt er opprettet.',
    })
    void loadProjects()
  }

  const updateVisibility = async (
    project: StudioProject,
    nextVisibility: 'internal' | 'private' | 'public',
  ) => {
    if (!supabase) return
    const willPublish = nextVisibility === 'public'
    const { error } = await supabase
      .from('sp_projects')
      .update({
        visibility: nextVisibility,
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
      text: willPublish
        ? 'Prosjektet er publisert.'
        : nextVisibility === 'private'
          ? 'Prosjektet er nå privat.'
          : 'Prosjektet er nå internt.',
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

  const handleAddMember = async (projectId: string) => {
    if (!supabase || !addMemberProfile) return
    const { error } = await supabase.from('sp_project_members').insert({
      project_id: projectId,
      profile_id: addMemberProfile,
      role: addMemberRole,
    })
    if (error) {
      setNotice({ tone: 'error', text: 'Medlemmet kunne ikke legges til.' })
      return
    }
    setAddMemberProject(null)
    setAddMemberProfile('')
    setAddMemberRole('member')
    setNotice({ tone: 'success', text: 'Prosjektmedlem lagt til.' })
    void loadProjects()
  }

  const removeMember = async (pmId: string) => {
    if (!supabase) return
    await supabase.from('sp_project_members').delete().eq('id', pmId)
    void loadProjects()
  }

  const handleDocumentUpload = async (projectId: string) => {
    if (!supabase || !userId || !documentFile) return
    if (documentFile.size > 20 * 1024 * 1024) {
      setNotice({ tone: 'error', text: 'Dokumentet kan være maksimalt 20 MB.' })
      return
    }
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ]
    if (!allowedTypes.includes(documentFile.type)) {
      setNotice({ tone: 'error', text: 'Dokumenttypen støttes ikke.' })
      return
    }
    setUploadingDocumentFor(projectId)
    const safeName = documentFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-160)
    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('sp-project-documents')
      .upload(storagePath, documentFile, {
        contentType: documentFile.type,
        upsert: false,
      })
    if (uploadError) {
      setUploadingDocumentFor(null)
      setNotice({ tone: 'error', text: 'Dokumentet kunne ikke lastes opp.' })
      return
    }
    const { error: metadataError } = await supabase
      .from('sp_project_documents')
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        file_name: documentFile.name,
        mime_type: documentFile.type,
        size_bytes: documentFile.size,
        uploaded_by: userId,
      })
    setUploadingDocumentFor(null)
    setDocumentFile(null)
    if (metadataError) {
      await supabase.storage.from('sp-project-documents').remove([storagePath])
      setNotice({ tone: 'error', text: 'Dokumentets metadata kunne ikke lagres.' })
      return
    }
    setNotice({ tone: 'success', text: 'Dokumentet er lagt til i prosjektet.' })
    void loadProjects()
  }

  const downloadDocument = async (document: ProjectDocument) => {
    if (!supabase) return
    const { data, error } = await supabase.storage
      .from('sp-project-documents')
      .createSignedUrl(document.storage_path, 60)
    if (error || !data?.signedUrl) {
      setNotice({ tone: 'error', text: 'Dokumentet kunne ikke åpnes.' })
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
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
          <label htmlFor="project-visibility">Synlighet</label>
          <select
            id="project-visibility"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as 'internal' | 'private' | 'public')
            }
          >
            <option value="internal">Internt – alle aktive medlemmer</option>
            <option value="private">Privat – kun prosjektets deltakere</option>
            <option value="public">Offentlig – publiseres på nettsiden</option>
          </select>
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
                  <select
                    aria-label={`Synlighet for ${project.title}`}
                    value={project.visibility}
                    onChange={(e) =>
                      void updateVisibility(
                        project,
                        e.target.value as 'internal' | 'private' | 'public',
                      )
                    }
                  >
                    <option value="internal">Internt</option>
                    <option value="private">Privat</option>
                    <option value="public">Offentlig</option>
                  </select>
                  <button
                    className="quiet-button"
                    onClick={() =>
                      setAddMemberProject(
                        addMemberProject === project.id ? null : project.id,
                      )
                    }
                  >
                    Medlemmer ({projectMembers.get(project.id)?.length ?? 0})
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
                {addMemberProject === project.id && (
                  <div className="project-members-section">
                    {(projectMembers.get(project.id) ?? []).map((pm) => (
                      <div key={pm.id} className="project-member-row">
                        <span>{pm.profile?.display_name ?? 'Ukjent'}</span>
                        <span className="overview-meta">{pm.role}</span>
                        <button
                          className="quiet-button"
                          onClick={() => void removeMember(pm.id)}
                        >
                          Fjern
                        </button>
                      </div>
                    ))}
                    <div className="form-row" style={{ marginTop: '0.5rem' }}>
                      <select
                        value={addMemberProfile}
                        onChange={(e) => setAddMemberProfile(e.target.value)}
                      >
                        <option value="">Velg medlem …</option>
                        {allProfiles
                          .filter(
                            (p) =>
                              !(projectMembers.get(project.id) ?? []).some(
                                (pm) => pm.profile_id === p.id,
                              ),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.display_name}
                            </option>
                          ))}
                      </select>
                      <select
                        value={addMemberRole}
                        onChange={(e) => setAddMemberRole(e.target.value)}
                      >
                        <option value="lead">Leder</option>
                        <option value="member">Medlem</option>
                        <option value="observer">Observatør</option>
                      </select>
                      <button
                        className="quiet-button"
                        disabled={!addMemberProfile}
                        onClick={() => void handleAddMember(project.id)}
                      >
                        Legg til
                      </button>
                    </div>
                  </div>
                )}
                <div className="project-members-section">
                  <strong>Dokumenter</strong>
                  {(projectDocuments.get(project.id) ?? []).length === 0 ? (
                    <p className="overview-meta">Ingen dokumenter ennå.</p>
                  ) : (
                    (projectDocuments.get(project.id) ?? []).map((document) => (
                      <div key={document.id} className="project-member-row">
                        <span>{document.file_name}</span>
                        <button
                          className="quiet-button"
                          onClick={() => void downloadDocument(document)}
                        >
                          Åpne
                        </button>
                      </div>
                    ))
                  )}
                  <div className="image-upload-row">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      className="quiet-button"
                      disabled={!documentFile || uploadingDocumentFor === project.id}
                      onClick={() => void handleDocumentUpload(project.id)}
                    >
                      {uploadingDocumentFor === project.id
                        ? 'Laster opp …'
                        : 'Last opp dokument'}
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
