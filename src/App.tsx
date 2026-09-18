import { useState } from 'react'

const publicNavigation = ['Prosjekter', 'Tjenester', 'Innsikt', 'Om oss']

function App() {
  const [studioOpen, setStudioOpen] = useState(false)

  return (
    <main>
      <header className="site-header" aria-label="Hovednavigasjon">
        <a className="wordmark" href="#top" aria-label="Secret Pioneers – hjem">
          <span className="mark" aria-hidden="true">
            SP
          </span>
          Secret Pioneers
        </a>
        <nav aria-label="Offentlig navigasjon">
          {publicNavigation.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
        <button className="text-button" onClick={() => setStudioOpen(true)}>
          Medlemsinnlogging <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">NHH · Bergen · Etablert 2026</p>
        <h1>
          En ny generasjon
          <br />
          <em>pionerer.</em>
        </h1>
        <p className="hero-copy">
          Secret Pioneers er et rom for ideer, utvikling og verdiskaping – med finans og
          økonomi som vårt utgangspunkt.
        </p>
        <a className="button button-primary" href="#prosjekter">
          Se hva vi bygger <span aria-hidden="true">↓</span>
        </a>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-core" />
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <span className="orbit-star" />
        </div>
      </section>

      <section className="principle" id="prosjekter">
        <p className="eyebrow">Premiss</p>
        <p className="principle-statement">
          Ubegrenset takhøyde for ideer som fortjener å bli undersøkt.
        </p>
        <div className="principle-grid">
          <article>
            <span>01</span>
            <h2>Utforske</h2>
            <p>Vi undersøker muligheter der andre ser avgrensninger.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Utvikle</h2>
            <p>Vi omformer innsikt til konsepter, produkter og samarbeid.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Skape verdi</h2>
            <p>Vi setter prosjekter i bevegelse med nysgjerrighet og presisjon.</p>
          </article>
        </div>
      </section>

      <section className="launch-card" id="tjenester">
        <p className="eyebrow">Under utvikling</p>
        <h2>Dette er begynnelsen.</h2>
        <p>
          En selektiv portefølje av prosjekter, digitale løsninger og innsikt lanseres
          her.
        </p>
        <a className="text-link" href="mailto:hello@secretpioneers.no">
          Ta kontakt <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer>
        <p>© 2026 Secret Pioneers</p>
        <a href="mailto:hello@secretpioneers.no">hello@secretpioneers.no</a>
      </footer>

      {studioOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="studio-preview"
            aria-labelledby="studio-preview-title"
            role="dialog"
            aria-modal="true"
          >
            <button
              className="close-button"
              onClick={() => setStudioOpen(false)}
              aria-label="Lukk forhåndsvisning av Studio"
            >
              ×
            </button>
            <p className="eyebrow">Secret Pioneers Studio</p>
            <h2 id="studio-preview-title">Arbeidsrommet kommer i neste fase.</h2>
            <p>
              Innlogging, medlemsstyrt samarbeid og sanntidspublisering bygges på en
              sikker Supabase-kjerne.
            </p>
            <button
              className="button button-primary"
              onClick={() => setStudioOpen(false)}
            >
              Tilbake til siden
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
