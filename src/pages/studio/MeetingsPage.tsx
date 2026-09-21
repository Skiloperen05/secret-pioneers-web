import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/hooks'
import type {
  Decision,
  Meeting,
  MeetingMinutes,
  Notice,
  Profile,
  StudioProject,
} from '../../lib/types'

export default function MeetingsPage() {
  const { userId } = useSession()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [minutes, setMinutes] = useState<Map<string, MeetingMinutes>>(new Map())
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState('general')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(() => {
    const client = supabase
    if (!client) return
    void Promise.all([
      client
        .from('sp_meetings')
        .select(
          'id, title, meeting_type, scheduled_at, duration_minutes, location, agenda, created_by, project_id, created_at',
        )
        .order('scheduled_at', { ascending: false })
        .limit(50),
      client
        .from('sp_meeting_minutes')
        .select('id, meeting_id, body, recorded_by, status, created_at'),
      client
        .from('sp_decisions')
        .select(
          'id, meeting_id, title, description, owner_id, deadline, status, created_at',
        )
        .order('created_at', { ascending: false }),
      client
        .from('sp_projects')
        .select(
          'id, title, slug, summary, status, cover_image_path, visibility, is_public, published_at',
        ),
      client.from('sp_profiles').select('id, display_name, avatar_path, bio'),
    ]).then(([meetRes, minRes, decRes, projectRes, memberRes]) => {
      setMeetings(meetRes.data ?? [])
      const minMap = new Map<string, MeetingMinutes>()
      for (const m of minRes.data ?? []) minMap.set(m.meeting_id, m)
      setMinutes(minMap)
      const loadedMembers = memberRes.data ?? []
      const memberMap = new Map(loadedMembers.map((member) => [member.id, member]))
      setMembers(loadedMembers)
      setProjects((projectRes.data ?? []) as StudioProject[])
      setDecisions(
        (decRes.data ?? []).map((decision) => ({
          ...decision,
          owner: decision.owner_id ? memberMap.get(decision.owner_id) : undefined,
        })),
      )
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (userId) loadData()
  }, [userId, loadData])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !userId) return
    const trimmed = title.trim()
    if (!trimmed || !scheduledAt) return
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.from('sp_meetings').insert({
      title: trimmed,
      meeting_type: meetingType,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: parseInt(duration) || 60,
      location: location.trim() || null,
      agenda: agenda.trim() || null,
      project_id: projectId || null,
      created_by: userId,
    })
    setSaving(false)
    if (error) {
      setNotice({ tone: 'error', text: 'Møtet kunne ikke opprettes.' })
      return
    }
    setTitle('')
    setMeetingType('general')
    setScheduledAt('')
    setDuration('60')
    setLocation('')
    setAgenda('')
    setProjectId('')
    setNotice({ tone: 'success', text: 'Møte opprettet.' })
    void loadData()
  }

  const saveMinutes = async (meetingId: string, body: string) => {
    if (!supabase || !userId) return
    const existing = minutes.get(meetingId)
    if (existing) {
      await supabase
        .from('sp_meeting_minutes')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('sp_meeting_minutes').insert({
        meeting_id: meetingId,
        body,
        recorded_by: userId,
      })
    }
    setNotice({ tone: 'success', text: 'Referat lagret.' })
    void loadData()
  }

  const addDecision = async (
    meetingId: string,
    input: { title: string; ownerId: string; deadline: string },
  ) => {
    if (!supabase || !input.title.trim()) return
    await supabase.from('sp_decisions').insert({
      meeting_id: meetingId,
      title: input.title.trim(),
      owner_id: input.ownerId || null,
      deadline: input.deadline || null,
    })
    setNotice({ tone: 'success', text: 'Beslutning registrert.' })
    void loadData()
  }

  const updateDecisionStatus = async (decisionId: string, status: string) => {
    if (!supabase) return
    const { error } = await supabase
      .from('sp_decisions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', decisionId)
    if (error) {
      setNotice({ tone: 'error', text: 'Beslutningen kunne ikke oppdateres.' })
      return
    }
    setNotice({ tone: 'success', text: 'Beslutningen er oppdatert.' })
    void loadData()
  }

  const typeLabels: Record<string, string> = {
    board: 'Styremøte',
    general: 'Generelt',
    project: 'Prosjektmøte',
    workshop: 'Workshop',
  }

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) return <p className="loading-text">Henter møter …</p>

  const selected = meetings.find((m) => m.id === selectedMeeting)

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Samarbeid</p>
        <h1>Møter</h1>
      </div>

      {!selectedMeeting ? (
        <>
          <section className="studio-card">
            <h2>Nytt møte</h2>
            <form className="studio-form" onSubmit={handleCreate}>
              <label htmlFor="meet-title">Tittel</label>
              <input
                id="meet-title"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="form-row">
                <div>
                  <label htmlFor="meet-type">Type</label>
                  <select
                    id="meet-type"
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                  >
                    <option value="general">Generelt</option>
                    <option value="board">Styremøte</option>
                    <option value="project">Prosjektmøte</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="meet-duration">Varighet (min)</label>
                  <input
                    id="meet-duration"
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              <label htmlFor="meet-when">Tidspunkt</label>
              <input
                id="meet-when"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <label htmlFor="meet-location">Sted / lenke</label>
              <input
                id="meet-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Rom 302 / Zoom-lenke"
              />
              <label htmlFor="meet-project">Prosjekt</label>
              <select
                id="meet-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Felles møte</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <label htmlFor="meet-agenda">Agenda</label>
              <textarea
                id="meet-agenda"
                rows={4}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
              <button className="button button-primary" disabled={saving}>
                {saving ? 'Oppretter …' : 'Opprett møte'}
              </button>
            </form>
          </section>

          {notice && (
            <p className={`auth-message ${notice.tone}`} role="status">
              {notice.text}
            </p>
          )}

          <section className="studio-card">
            <h2>Alle møter</h2>
            {meetings.length === 0 ? (
              <p>Ingen møter ennå.</p>
            ) : (
              <ul className="studio-project-list">
                {meetings.map((meeting) => (
                  <li key={meeting.id}>
                    <div>
                      <strong>{meeting.title}</strong>
                      <span className="overview-meta">
                        {typeLabels[meeting.meeting_type]} ·{' '}
                        {formatDateTime(meeting.scheduled_at)}
                        {meeting.location && ` · ${meeting.location}`}
                      </span>
                    </div>
                    <div className="studio-project-actions">
                      {minutes.has(meeting.id) && (
                        <span className="status-badge">Referat</span>
                      )}
                      <button
                        className="quiet-button"
                        onClick={() => setSelectedMeeting(meeting.id)}
                      >
                        Åpne
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : selected ? (
        <MeetingDetail
          meeting={selected}
          minutes={minutes.get(selected.id) ?? null}
          decisions={decisions.filter((d) => d.meeting_id === selected.id)}
          members={members}
          onSaveMinutes={(body) => void saveMinutes(selected.id, body)}
          onAddDecision={(input) => void addDecision(selected.id, input)}
          onUpdateDecisionStatus={(decisionId, status) =>
            void updateDecisionStatus(decisionId, status)
          }
          onBack={() => setSelectedMeeting(null)}
          notice={notice}
        />
      ) : null}
    </div>
  )
}

function MeetingDetail({
  meeting,
  minutes,
  decisions,
  members,
  onSaveMinutes,
  onAddDecision,
  onUpdateDecisionStatus,
  onBack,
  notice,
}: {
  meeting: Meeting
  minutes: MeetingMinutes | null
  decisions: Decision[]
  members: Profile[]
  onSaveMinutes: (body: string) => void
  onAddDecision: (input: { title: string; ownerId: string; deadline: string }) => void
  onUpdateDecisionStatus: (decisionId: string, status: string) => void
  onBack: () => void
  notice: Notice | null
}) {
  const [body, setBody] = useState(minutes?.body ?? '')
  const [newDecision, setNewDecision] = useState('')
  const [decisionOwner, setDecisionOwner] = useState('')
  const [decisionDeadline, setDecisionDeadline] = useState('')

  return (
    <>
      <button className="quiet-button" onClick={onBack}>
        ← Tilbake til møtelisten
      </button>

      <section className="studio-card" style={{ marginTop: '1rem' }}>
        <h2>{meeting.title}</h2>
        <p className="overview-meta">
          {new Date(meeting.scheduled_at).toLocaleDateString('nb-NO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {meeting.location && ` · ${meeting.location}`}
        </p>
        {meeting.agenda && (
          <>
            <h3>Agenda</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{meeting.agenda}</p>
          </>
        )}
      </section>

      <section className="studio-card">
        <h2>Referat</h2>
        <div className="studio-form">
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv referat her …"
          />
          <button className="button button-primary" onClick={() => onSaveMinutes(body)}>
            Lagre referat
          </button>
        </div>
      </section>

      <section className="studio-card">
        <h2>Beslutninger</h2>
        {decisions.length > 0 && (
          <ul className="studio-project-list">
            {decisions.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>{d.title}</strong>
                  {d.deadline && (
                    <span className="overview-meta">Frist: {d.deadline}</span>
                  )}
                  {d.owner && (
                    <span className="overview-meta">
                      Ansvar: {d.owner.display_name}
                    </span>
                  )}
                </div>
                <div className="studio-project-actions">
                  <span className={`status-badge status-${d.status}`}>
                    {d.status === 'open' ? 'Åpen' : 'Fullført'}
                  </span>
                  {d.status === 'open' && (
                    <button
                      className="quiet-button"
                      onClick={() => onUpdateDecisionStatus(d.id, 'completed')}
                    >
                      Fullfør
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="studio-form" style={{ marginTop: '1rem' }}>
          <label htmlFor="new-decision">Ny beslutning</label>
          <input
            id="new-decision"
            value={newDecision}
            onChange={(e) => setNewDecision(e.target.value)}
            placeholder="Hva ble vedtatt?"
          />
          <label htmlFor="decision-owner">Ansvarlig</label>
          <select
            id="decision-owner"
            value={decisionOwner}
            onChange={(e) => setDecisionOwner(e.target.value)}
          >
            <option value="">Ikke tildelt</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </select>
          <label htmlFor="decision-deadline">Frist</label>
          <input
            id="decision-deadline"
            type="date"
            value={decisionDeadline}
            onChange={(e) => setDecisionDeadline(e.target.value)}
          />
          <button
            className="button button-primary"
            onClick={() => {
              onAddDecision({
                title: newDecision,
                ownerId: decisionOwner,
                deadline: decisionDeadline,
              })
              setNewDecision('')
              setDecisionOwner('')
              setDecisionDeadline('')
            }}
            disabled={!newDecision.trim()}
          >
            Registrer beslutning
          </button>
        </div>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}
    </>
  )
}
