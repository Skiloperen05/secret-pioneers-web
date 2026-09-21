import { useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import type { Notice, SiteSettings } from '../../lib/types'
import { useSession } from '../../lib/hooks'

export default function PublishingPage() {
  const { userId } = useSession()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client || !userId) return
    void client
      .from('sp_site_settings')
      .select('id, site_title, contact_email, hero_copy, is_published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data)
        setLoading(false)
      })
  }, [userId])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !settings) return
    setSaving(true)
    setNotice(null)
    const { error } = await supabase
      .from('sp_site_settings')
      .update({
        site_title: settings.site_title.trim(),
        contact_email: settings.contact_email?.trim() || null,
        hero_copy: settings.hero_copy?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
    setSaving(false)
    setNotice(
      error
        ? { tone: 'error', text: 'Endringene kunne ikke lagres.' }
        : { tone: 'success', text: 'Forsiden er oppdatert.' },
    )
  }

  if (loading) return <p className="loading-text">Henter innhold …</p>

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Publisering</p>
        <h1>Rediger forsiden</h1>
        <p>
          Endringer du gjør her vises umiddelbart på den offentlige nettsiden etter at
          du lagrer.
        </p>
      </div>

      {settings ? (
        <form className="studio-form" onSubmit={handleSave}>
          <label htmlFor="site-title">Navn på nettstedet</label>
          <input
            id="site-title"
            required
            value={settings.site_title}
            onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
          />
          <label htmlFor="contact-email">Kontaktadresse</label>
          <input
            id="contact-email"
            type="email"
            value={settings.contact_email ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, contact_email: e.target.value })
            }
          />
          <label htmlFor="hero-copy">Introduksjon</label>
          <textarea
            id="hero-copy"
            rows={5}
            value={settings.hero_copy ?? ''}
            onChange={(e) => setSettings({ ...settings, hero_copy: e.target.value })}
          />
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Lagrer …' : 'Publiser endringer'}
          </button>
          {notice && (
            <p className={`auth-message ${notice.tone}`} role="status">
              {notice.text}
            </p>
          )}
        </form>
      ) : (
        <p>Ingen forsideinnstillinger funnet.</p>
      )}
    </div>
  )
}
