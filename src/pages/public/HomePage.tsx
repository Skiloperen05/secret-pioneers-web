import { Link } from 'react-router-dom'

import { usePublicProjects, usePublicSettings } from '../../lib/usePublicData'

const fallbackHeroCopy =
  'Secret Pioneers er et rom for ideer, utvikling og verdiskaping – med finans og økonomi som vårt utgangspunkt.'

export default function HomePage() {
  const { settings } = usePublicSettings()
  const { projects } = usePublicProjects()
  const contactEmail = settings?.contact_email || 'hello@secretpioneers.no'
  const heroCopy = settings?.hero_copy || fallbackHeroCopy

  return (
    <main>
      <section className="hero" id="top">
        <p className="eyebrow">NHH · Bergen · Etablert 2026</p>
        <h1>
          En ny generasjon
          <br />
          <em>pionerer.</em>
        </h1>
        <p className="hero-copy">{heroCopy}</p>
        <Link className="button button-primary" to="/prosjekter">
          Se hva vi bygger <span aria-hidden="true">↓</span>
        </Link>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-core" />
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <span className="orbit-star" />
        </div>
      </section>

      <section className="principle">
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

      <section className="projects-section" aria-labelledby="projects-title">
        <div className="section-heading">
          <p className="eyebrow">Pågående prosjekter</p>
          <h2 id="projects-title">Prosjekter i bevegelse.</h2>
        </div>
        {projects.length > 0 ? (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <span>
                  {project.status === 'published' ? 'Publisert' : project.status}
                </span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-projects">
            Porteføljen åpner når de første prosjektene er klare for offentligheten.
          </p>
        )}
      </section>

      <section className="launch-card">
        <p className="eyebrow">Under utvikling</p>
        <h2>Dette er begynnelsen.</h2>
        <p>
          En selektiv portefølje av prosjekter, digitale løsninger og innsikt lanseres
          her.
        </p>
        <a className="text-link" href={`mailto:${contactEmail}`}>
          Ta kontakt <span aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  )
}
