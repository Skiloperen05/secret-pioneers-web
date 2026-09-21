import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/hooks'
import type { Meeting, Notification, Task } from '../../lib/types'

export default function OverviewPage() {
  const { userId } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const client = supabase
    if (!client || !userId) return
    void Promise.all([
      client
        .from('sp_tasks')
        .select('id, title, priority, status, due_date, project_id')
        .eq('assignee_id', userId)
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10),
      client
        .from('sp_meetings')
        .select(
          'id, title, meeting_type, scheduled_at, duration_minutes, location, agenda, created_by, project_id, created_at',
        )
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),
      client
        .from('sp_notifications')
        .select('id, recipient_id, type, title, body, link, is_read, created_at')
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([taskRes, meetingRes, notifRes]) => {
      setTasks((taskRes.data ?? []) as Task[])
      setMeetings(meetingRes.data ?? [])
      setNotifications(notifRes.data ?? [])
      setLoading(false)
    })
  }, [userId])

  useEffect(() => {
    if (userId) load()
  }, [userId, load])

  const markRead = async (id: string) => {
    if (!supabase) return
    await supabase.from('sp_notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const priorityLabel: Record<string, string> = {
    urgent: 'Haster',
    high: 'Høy',
    medium: 'Middels',
    low: 'Lav',
  }

  if (loading) return <p className="loading-text">Henter oversikt …</p>

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Arbeidsrom</p>
        <h1>Oversikt</h1>
      </div>

      <div className="overview-grid">
        <section className="studio-card">
          <h2>Mine oppgaver</h2>
          {tasks.length === 0 ? (
            <p>Ingen åpne oppgaver.</p>
          ) : (
            <ul className="overview-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link to="/studio/oppgaver">
                    <strong>{task.title}</strong>
                    <span className="overview-meta">
                      {priorityLabel[task.priority] ?? task.priority}
                      {task.due_date && ` · Frist ${formatDate(task.due_date)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="studio-card">
          <h2>Kommende møter</h2>
          {meetings.length === 0 ? (
            <p>Ingen kommende møter.</p>
          ) : (
            <ul className="overview-list">
              {meetings.map((meeting) => (
                <li key={meeting.id}>
                  <Link to="/studio/moter">
                    <strong>{meeting.title}</strong>
                    <span className="overview-meta">
                      {formatDateTime(meeting.scheduled_at)}
                      {meeting.location && ` · ${meeting.location}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="studio-card">
          <h2>Varsler</h2>
          {notifications.length === 0 ? (
            <p>Ingen uleste varsler.</p>
          ) : (
            <ul className="overview-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <div>
                    <strong>{n.title}</strong>
                    {n.body && <span className="overview-meta">{n.body}</span>}
                  </div>
                  <button className="quiet-button" onClick={() => void markRead(n.id)}>
                    Merk lest
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
