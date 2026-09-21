import { usePublicProjects } from '../../lib/usePublicData'

export default function ProjectsPage() {
  const { projects, loading } = usePublicProjects()

  return (
    <main className="page-container">
      <section className="page-header">
        <p className="eyebrow">Portefølje</p>
        <h1 className="page-title">Prosjekter</h1>
        <p className="page-intro">
          Vi jobber med prosjekter innen finans, teknologi og verdiskaping. Her er
          initiativene vi har valgt å dele offentlig.
        </p>
      </section>

      {loading ? (
        <p className="loading-text">Henter prosjekter …</p>
      ) : projects.length > 0 ? (
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
    </main>
  )
}
