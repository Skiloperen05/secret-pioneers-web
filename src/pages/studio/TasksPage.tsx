import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/hooks'
import type { Notice, Profile, StudioProject, Task } from '../../lib/types'

export default function TasksPage() {
  const { userId } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [filter, setFilter] = useState<'all' | 'mine'>('mine')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(() => {
    const client = supabase
    if (!client) return
    void Promise.all([
      client
        .from('sp_tasks')
        .select(
          'id, title, description, assignee_id, created_by, priority, status, due_date, completed_at, created_at, project_id',
        )
        .in('status', ['todo', 'in_progress'])
        .order('created_at', { ascending: false }),
      client.from('sp_profiles').select('id, display_name, avatar_path, bio'),
      client
        .from('sp_projects')
        .select(
          'id, title, slug, summary, status, cover_image_path, visibility, is_public, published_at',
        ),
    ]).then(([taskRes, memberRes, projectRes]) => {
      const profiles = memberRes.data ?? []
      setMembers(profiles)
      const availableProjects = (projectRes.data ?? []) as StudioProject[]
      setProjects(availableProjects)
      const profileMap = new Map(profiles.map((p) => [p.id, p]))
      const projectMap = new Map(availableProjects.map((p) => [p.id, p]))
      setTasks(
        (taskRes.data ?? []).map((t) => ({
          ...t,
          assignee: t.assignee_id ? profileMap.get(t.assignee_id) : undefined,
          project: t.project_id
            ? { title: projectMap.get(t.project_id)?.title ?? 'Prosjekt' }
            : undefined,
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
    if (!trimmed) return
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.from('sp_tasks').insert({
      title: trimmed,
      description: description.trim() || null,
      assignee_id: assigneeId || null,
      project_id: projectId || null,
      created_by: userId,
      priority,
      due_date: dueDate || null,
    })
    setSaving(false)
    if (error) {
      setNotice({ tone: 'error', text: 'Oppgaven kunne ikke opprettes.' })
      return
    }
    setTitle('')
    setDescription('')
    setAssigneeId('')
    setProjectId('')
    setPriority('medium')
    setDueDate('')
    setNotice({ tone: 'success', text: 'Oppgave opprettet.' })
    void loadData()
  }

  const updateStatus = async (taskId: string, status: string) => {
    if (!supabase) return
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'done') update.completed_at = new Date().toISOString()
    await supabase.from('sp_tasks').update(update).eq('id', taskId)
    void loadData()
  }

  const filteredTasks =
    filter === 'mine' ? tasks.filter((t) => t.assignee_id === userId) : tasks

  const priorityLabel: Record<string, string> = {
    urgent: 'Haster',
    high: 'Høy',
    medium: 'Middels',
    low: 'Lav',
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })

  if (loading) return <p className="loading-text">Henter oppgaver …</p>

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Arbeid</p>
        <h1>Oppgaver</h1>
      </div>

      <section className="studio-card">
        <h2>Ny oppgave</h2>
        <form className="studio-form" onSubmit={handleCreate}>
          <label htmlFor="task-title">Tittel</label>
          <input
            id="task-title"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="task-desc">Beskrivelse</label>
          <textarea
            id="task-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label htmlFor="task-assignee">Tildel til</label>
          <select
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Ingen</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <label htmlFor="task-project">Prosjekt</label>
          <select
            id="task-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Felles oppgave</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <div className="form-row">
            <div>
              <label htmlFor="task-priority">Prioritet</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Lav</option>
                <option value="medium">Middels</option>
                <option value="high">Høy</option>
                <option value="urgent">Haster</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-due">Frist</label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Oppretter …' : 'Opprett oppgave'}
          </button>
        </form>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="studio-card">
        <div className="card-header-row">
          <h2>Åpne oppgaver</h2>
          <div className="filter-tabs">
            <button
              className={filter === 'mine' ? 'active' : ''}
              onClick={() => setFilter('mine')}
            >
              Mine
            </button>
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              Alle
            </button>
          </div>
        </div>
        {filteredTasks.length === 0 ? (
          <p>Ingen åpne oppgaver{filter === 'mine' ? ' tildelt deg' : ''}.</p>
        ) : (
          <ul className="studio-project-list">
            {filteredTasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span className="overview-meta">
                    {priorityLabel[task.priority]}
                    {task.project && ` · ${task.project.title}`}
                    {task.assignee && ` · ${task.assignee.display_name}`}
                    {task.due_date && ` · Frist ${formatDate(task.due_date)}`}
                  </span>
                </div>
                <div className="studio-project-actions">
                  <span className={`status-badge status-${task.status}`}>
                    {task.status === 'todo' ? 'Å gjøre' : 'Pågår'}
                  </span>
                  {task.status === 'todo' && (
                    <button
                      className="quiet-button"
                      onClick={() => void updateStatus(task.id, 'in_progress')}
                    >
                      Start
                    </button>
                  )}
                  <button
                    className="quiet-button"
                    onClick={() => void updateStatus(task.id, 'done')}
                  >
                    Fullfør
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
