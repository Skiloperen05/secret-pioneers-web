import { usePublicArticles } from '../../lib/usePublicData'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function InsightPage() {
  const { articles, loading } = usePublicArticles()

  return (
    <main className="page-container">
      <section className="page-header">
        <p className="eyebrow">Innsikt</p>
        <h1 className="page-title">Artikler og analyser</h1>
        <p className="page-intro">
          Perspektiver fra Secret Pioneers — korte analyser, refleksjoner og
          oppdateringer fra prosjektene våre.
        </p>
      </section>

      {loading ? (
        <p className="loading-text">Henter artikler …</p>
      ) : articles.length > 0 ? (
        <div className="article-list">
          {articles.map((article) => (
            <article className="article-card" key={article.id}>
              <div className="article-meta">
                <span className="eyebrow">
                  {article.published_at
                    ? formatDate(article.published_at)
                    : 'Upublisert'}
                </span>
              </div>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              {article.body && (
                <div className="article-body">
                  {article.body
                    .split('\n')
                    .map((paragraph, i) =>
                      paragraph.trim() ? <p key={i}>{paragraph}</p> : null,
                    )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-projects">
          Våre første analyser og artikler publiseres snart.
        </p>
      )}
    </main>
  )
}
