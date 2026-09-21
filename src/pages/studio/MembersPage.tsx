import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/hooks'
import type { Invitation, MembershipRow, Notice } from '../../lib/types'

export default function MembersPage() {
  const { userId } = useSession()
  const [members, setMembers] = useState<MembershipRow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('member')
  const [sending, setSending] = useState(false)

  const loadData = useCallback(() => {
    const client = supabase
    if (!client) return
    void Promise.all([
      client
        .from('sp_memberships')
        .select(
          'id, profile_id, role, status, created_at, profile:sp_profiles(id, display_name, avatar_path, bio)',
        )
        .order('created_at', { ascending: true }),
      client
        .from('sp_invitations')
        .select('id, email, role, status, expires_at, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]).then(([membRes, invRes]) => {
      setMembers(
        (membRes.data ?? []).map((m) => ({
          ...m,
          profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
        })),
      )
      setInvitations(invRes.data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (userId) loadData()
  }, [userId, loadData])

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !userId) return
    const email = invEmail.trim().toLowerCase()
    if (!email) return
    setSending(true)
    setNotice(null)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const tokenHex = Array.from(tokenBytes, (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(tokenHex))
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')

    const { error } = await supabase.from('sp_invitations').insert({
      email,
      role: invRole,
      token_hash: tokenHash,
      invited_by: userId,
    })
    setSending(false)
    if (error) {
      setNotice({ tone: 'error', text: 'Invitasjonen kunne ikke opprettes.' })
      return
    }
    setInvEmail('')
    setInvRole('member')
    setNotice({ tone: 'success', text: `Invitasjon opprettet for ${email}.` })
    void loadData()
  }

  const revokeInvitation = async (id: string) => {
    if (!supabase) return
    await supabase.from('sp_invitations').update({ status: 'revoked' }).eq('id', id)
    setNotice({ tone: 'success', text: 'Invitasjonen er trukket tilbake.' })
    void loadData()
  }

  const roleLabels: Record<string, string> = {
    owner: 'Eier',
    admin: 'Administrator',
    editor: 'Redaktør',
    finance: 'Økonomi',
    project_lead: 'Prosjektleder',
    member: 'Medlem',
    guest: 'Gjest',
  }

  const statusLabels: Record<string, string> = {
    active: 'Aktiv',
    invited: 'Invitert',
    suspended: 'Suspendert',
    former: 'Tidligere',
  }

  if (loading) return <p className="loading-text">Henter medlemmer …</p>

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Organisasjon</p>
        <h1>Medlemmer</h1>
      </div>

      <section className="studio-card">
        <h2>Inviter nytt medlem</h2>
        <form className="studio-form" onSubmit={handleInvite}>
          <label htmlFor="inv-email">E-post</label>
          <input
            id="inv-email"
            type="email"
            required
            placeholder="navn@eksempel.no"
            value={invEmail}
            onChange={(e) => setInvEmail(e.target.value)}
          />
          <label htmlFor="inv-role">Rolle</label>
          <select
            id="inv-role"
            value={invRole}
            onChange={(e) => setInvRole(e.target.value)}
          >
            <option value="member">Medlem</option>
            <option value="editor">Redaktør</option>
            <option value="project_lead">Prosjektleder</option>
            <option value="finance">Økonomi</option>
            <option value="admin">Administrator</option>
            <option value="guest">Gjest</option>
          </select>
          <button className="button button-primary" disabled={sending}>
            {sending ? 'Sender …' : 'Opprett invitasjon'}
          </button>
        </form>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      {invitations.length > 0 && (
        <section className="studio-card">
          <h2>Ventende invitasjoner</h2>
          <ul className="studio-project-list">
            {invitations.map((inv) => (
              <li key={inv.id}>
                <div>
                  <strong>{inv.email}</strong>
                  <span>{roleLabels[inv.role] ?? inv.role}</span>
                </div>
                <div className="studio-project-actions">
                  <span>
                    Utløper{' '}
                    {new Date(inv.expires_at).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <button
                    className="quiet-button"
                    onClick={() => void revokeInvitation(inv.id)}
                  >
                    Trekk tilbake
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="studio-card">
        <h2>Alle medlemmer</h2>
        {members.length === 0 ? (
          <p>Ingen medlemmer ennå.</p>
        ) : (
          <ul className="studio-project-list">
            {members.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.profile?.display_name ?? 'Ukjent'}</strong>
                  <span>
                    {roleLabels[m.role] ?? m.role} ·{' '}
                    {statusLabels[m.status] ?? m.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
