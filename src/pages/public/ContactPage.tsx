import { useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import type { Notice } from '../../lib/types'
import { usePublicSettings } from '../../lib/usePublicData'

export default function ContactPage() {
  const { settings } = usePublicSettings()
  const contactEmail = settings?.contact_email || 'hello@secretpioneers.no'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (honeypot) return
    if (!supabase) {
      setNotice({
        tone: 'error',
        text: 'Kontaktskjemaet er ikke tilgjengelig akkurat nå.',
      })
      return
    }
    setSending(true)
    setNotice(null)
    const { error } = await supabase.from('sp_contact_submissions').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    })
    setSending(false)
    if (error) {
      setNotice({
        tone: 'error',
        text: 'Meldingen kunne ikke sendes. Prøv igjen eller send oss en e-post.',
      })
      return
    }
    setName('')
    setEmail('')
    setMessage('')
    setNotice({
      tone: 'success',
      text: 'Takk for meldingen. Vi svarer så snart vi kan.',
    })
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <p className="eyebrow">Si hei</p>
        <h1 className="page-title">Kontakt</h1>
        <p className="page-intro">
          Har du en idé, et spørsmål eller ønsker å samarbeide? Send oss en melding, så
          tar vi kontakt.
        </p>
      </section>

      <div className="contact-grid">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="honey" aria-hidden="true">
            <label htmlFor="website">Nettsted</label>
            <input
              id="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <label htmlFor="contact-name">Navn</label>
          <input
            id="contact-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="contact-email">E-post</label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="contact-message">Melding</label>
          <textarea
            id="contact-message"
            required
            rows={6}
            maxLength={3000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="button button-primary" disabled={sending}>
            {sending ? 'Sender …' : 'Send melding'}
          </button>
          {notice && (
            <p className={`auth-message ${notice.tone}`} role="status">
              {notice.text}
            </p>
          )}
        </form>

        <div className="contact-info">
          <h3>Direkte kontakt</h3>
          <p>
            Du kan også nå oss på <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
          <h3>Beliggenhet</h3>
          <p>Norges Handelshøyskole, Bergen</p>
        </div>
      </div>
    </main>
  )
}
