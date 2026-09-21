import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { createSlug, useSession } from '../../lib/hooks'
import type { Notice, ServiceOffering } from '../../lib/types'

export default function StudioServicesPage() {
  const { userId } = useSession()
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [publishNow, setPublishNow] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadServices = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_service_offerings')
      .select('id, title, slug, description, status, sort_order, published_at')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setServices(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (userId) loadServices()
  }, [userId, loadServices])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !userId) return
    const trimmed = title.trim()
    const slug = createSlug(trimmed)
    if (!trimmed || !slug) {
      setNotice({ tone: 'error', text: 'Tjenesten trenger en gyldig tittel.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const nextOrder =
      services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 0
    const { error } = await supabase.from('sp_service_offerings').insert({
      title: trimmed,
      slug,
      description: description.trim() || null,
      status: publishNow ? 'published' : 'draft',
      sort_order: nextOrder,
      published_at: publishNow ? new Date().toISOString() : null,
    })
    setSaving(false)
    if (error) {
      setNotice({ tone: 'error', text: 'Tjenesten kunne ikke opprettes.' })
      return
    }
    setTitle('')
    setDescription('')
    setPublishNow(false)
    setNotice({
      tone: 'success',
      text: publishNow ? 'Tjenesten er publisert.' : 'Utkast er lagret.',
    })
    void loadServices()
  }

  const togglePublish = async (service: ServiceOffering) => {
    if (!supabase) return
    const willPublish = service.status !== 'published'
    const { error } = await supabase
      .from('sp_service_offerings')
      .update({
        status: willPublish ? 'published' : 'draft',
        published_at: willPublish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)
    if (error) {
      setNotice({ tone: 'error', text: 'Statusen kunne ikke endres.' })
      return
    }
    setNotice({
      tone: 'success',
      text: willPublish ? 'Tjenesten er publisert.' : 'Tjenesten er avpublisert.',
    })
    void loadServices()
  }

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Tilbud</p>
        <h1>Tjenester</h1>
      </div>

      <section className="studio-card">
        <h2>Ny tjeneste</h2>
        <form className="studio-form" onSubmit={handleCreate}>
          <label htmlFor="service-title">Tjenestenavn</label>
          <input
            id="service-title"
            maxLength={200}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="service-description">Beskrivelse</label>
          <textarea
            id="service-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="check-label" htmlFor="service-publish">
            <input
              checked={publishNow}
              id="service-publish"
              type="checkbox"
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publiser nå
          </label>
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Lagrer …' : publishNow ? 'Publiser tjeneste' : 'Lagre utkast'}
          </button>
        </form>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="studio-card">
        <h2>Alle tjenester</h2>
        {loading ? (
          <p className="loading-text">Henter tjenester …</p>
        ) : services.length === 0 ? (
          <p>Ingen tjenester ennå.</p>
        ) : (
          <ul className="studio-project-list">
            {services.map((service) => (
              <li key={service.id}>
                <div>
                  <strong>{service.title}</strong>
                  <span>{service.description || 'Ingen beskrivelse'}</span>
                </div>
                <div className="studio-project-actions">
                  <span>{service.status === 'published' ? 'Publisert' : 'Utkast'}</span>
                  <button
                    className="quiet-button"
                    onClick={() => void togglePublish(service)}
                  >
                    {service.status === 'published' ? 'Avpubliser' : 'Publiser'}
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
