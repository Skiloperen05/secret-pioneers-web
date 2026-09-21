import { useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/hooks'
import type { Notice } from '../../lib/types'

export default function StudioSettingsPage() {
  const { email } = useSession()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    if (newPassword.length < 12) {
      setNotice({ tone: 'error', text: 'Velg minst 12 tegn i passordet.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setNotice({ tone: 'error', text: 'Passordene er ikke like.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    setNewPassword('')
    setConfirmPassword('')
    setNotice(
      error
        ? { tone: 'error', text: 'Passordet kunne ikke lagres. Prøv igjen.' }
        : {
            tone: 'success',
            text: 'Passordet er lagret. Neste gang kan du logge inn direkte.',
          },
    )
  }

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Konto</p>
        <h1>Innstillinger</h1>
      </div>

      <section className="studio-card">
        <h2>Din konto</h2>
        <p>
          Innlogget som <strong>{email}</strong>.
        </p>
      </section>

      <section className="studio-card">
        <h2>Opprett eller bytt passord</h2>
        <p>
          Da kan du logge inn direkte neste gang. Passordet lagres bare hos Supabase —
          aldri i nettstedet eller GitHub.
        </p>
        <form className="studio-form" onSubmit={handleSetPassword}>
          <label htmlFor="new-password">Nytt passord</label>
          <input
            autoComplete="new-password"
            id="new-password"
            minLength={12}
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <label htmlFor="confirm-password">Gjenta passordet</label>
          <input
            autoComplete="new-password"
            id="confirm-password"
            minLength={12}
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Lagrer …' : 'Lagre passord'}
          </button>
          {notice && (
            <p className={`auth-message ${notice.tone}`} role="status">
              {notice.text}
            </p>
          )}
        </form>
      </section>
    </div>
  )
}
