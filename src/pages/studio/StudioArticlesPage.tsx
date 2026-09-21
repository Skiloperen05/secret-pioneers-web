import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { supabase } from '../../lib/supabase'
import { createSlug, useSession } from '../../lib/hooks'
import type { Article, Notice } from '../../lib/types'

export default function StudioArticlesPage() {
  const { userId } = useSession()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [publishNow, setPublishNow] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadArticles = useCallback(() => {
    const client = supabase
    if (!client) return
    void client
      .from('sp_articles')
      .select(
        'id, title, slug, excerpt, body, author_id, status, published_at, created_at',
      )
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setArticles((data ?? []).map((a) => ({ ...a, author_name: null })))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (userId) loadArticles()
  }, [userId, loadArticles])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !userId) return
    const trimmed = title.trim()
    const slug = createSlug(trimmed)
    if (!trimmed || !slug) {
      setNotice({ tone: 'error', text: 'Artikkelen trenger en gyldig tittel.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const { error } = await supabase.from('sp_articles').insert({
      title: trimmed,
      slug,
      excerpt: excerpt.trim() || null,
      body: body.trim() || null,
      author_id: userId,
      status: publishNow ? 'published' : 'draft',
      published_at: publishNow ? new Date().toISOString() : null,
    })
    setSaving(false)
    if (error) {
      setNotice({
        tone: 'error',
        text: 'Artikkelen kunne ikke opprettes. Prøv en annen tittel.',
      })
      return
    }
    setTitle('')
    setExcerpt('')
    setBody('')
    setPublishNow(false)
    setNotice({
      tone: 'success',
      text: publishNow ? 'Artikkelen er publisert.' : 'Utkast er lagret.',
    })
    void loadArticles()
  }

  const togglePublish = async (article: Article) => {
    if (!supabase) return
    const willPublish = article.status !== 'published'
    const { error } = await supabase
      .from('sp_articles')
      .update({
        status: willPublish ? 'published' : 'draft',
        published_at: willPublish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', article.id)
    if (error) {
      setNotice({ tone: 'error', text: 'Statusen kunne ikke endres.' })
      return
    }
    setNotice({
      tone: 'success',
      text: willPublish ? 'Artikkelen er publisert.' : 'Artikkelen er avpublisert.',
    })
    void loadArticles()
  }

  return (
    <div className="studio-page">
      <div className="studio-page-header">
        <p className="eyebrow">Innsikt</p>
        <h1>Artikler</h1>
      </div>

      <section className="studio-card">
        <h2>Ny artikkel</h2>
        <form className="studio-form" onSubmit={handleCreate}>
          <label htmlFor="article-title">Tittel</label>
          <input
            id="article-title"
            maxLength={200}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="article-excerpt">Kort oppsummering</label>
          <textarea
            id="article-excerpt"
            maxLength={500}
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          <label htmlFor="article-body">Innhold</label>
          <textarea
            id="article-body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <label className="check-label" htmlFor="article-publish">
            <input
              checked={publishNow}
              id="article-publish"
              type="checkbox"
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publiser nå
          </label>
          <button className="button button-primary" disabled={saving}>
            {saving ? 'Lagrer …' : publishNow ? 'Publiser artikkel' : 'Lagre utkast'}
          </button>
        </form>
      </section>

      {notice && (
        <p className={`auth-message ${notice.tone}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="studio-card">
        <h2>Alle artikler</h2>
        {loading ? (
          <p className="loading-text">Henter artikler …</p>
        ) : articles.length === 0 ? (
          <p>Ingen artikler ennå.</p>
        ) : (
          <ul className="studio-project-list">
            {articles.map((article) => (
              <li key={article.id}>
                <div>
                  <strong>{article.title}</strong>
                  <span>{article.excerpt || 'Ingen oppsummering'}</span>
                </div>
                <div className="studio-project-actions">
                  <span>{article.status === 'published' ? 'Publisert' : 'Utkast'}</span>
                  <button
                    className="quiet-button"
                    onClick={() => void togglePublish(article)}
                  >
                    {article.status === 'published' ? 'Avpubliser' : 'Publiser'}
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
