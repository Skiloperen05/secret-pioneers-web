import { usePublicServices } from '../../lib/usePublicData'

export default function ServicesPage() {
  const { services, loading } = usePublicServices()

  return (
    <main className="page-container">
      <section className="page-header">
        <p className="eyebrow">Hva vi tilbyr</p>
        <h1 className="page-title">Tjenester</h1>
        <p className="page-intro">
          Secret Pioneers tilbyr utvalgte tjenester og digitale løsninger for klienter
          som verdsetter faglig dybde og gjennomtenkt gjennomføring.
        </p>
      </section>

      {loading ? (
        <p className="loading-text">Henter tjenester …</p>
      ) : services.length > 0 ? (
        <div className="services-list">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-projects">
          Tjenestetilbudet publiseres når de første leveransene er klare.
        </p>
      )}
    </main>
  )
}
