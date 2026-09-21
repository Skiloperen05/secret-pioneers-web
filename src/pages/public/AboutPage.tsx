export default function AboutPage() {
  return (
    <main className="page-container">
      <section className="page-header">
        <p className="eyebrow">Hvem vi er</p>
        <h1 className="page-title">Om Secret Pioneers</h1>
      </section>

      <div className="about-content">
        <section className="about-block">
          <h2>Formål</h2>
          <p>
            Secret Pioneers er en gruppe med NHH-studenter som utfordrer tradisjonelle
            begrensninger. Vi tror på ubegrensede muligheter og skal være et rom med høy
            takhøyde for ideer og konsepter, utvikling, verdiskaping og læring.
          </p>
        </section>

        <section className="about-block">
          <h2>Retning</h2>
          <p>
            Retningen er hovedsakelig finans og økonomi. Arbeidet kombinerer faglig
            nysgjerrighet med praktisk gjennomføring gjennom egne prosjekter,
            kundeoppdrag, digitale løsninger og deling av innsikt.
          </p>
        </section>

        <section className="about-block">
          <h2>Grunnleggere</h2>
          <p>
            Secret Pioneers ble grunnlagt høsten 2026 av Birk Haugnes, Aleksander Moe og
            Sondre Skaland ved Norges Handelshøyskole i Bergen.
          </p>
        </section>

        <section className="about-block">
          <h2>Verdier</h2>
          <div className="values-grid">
            <div>
              <h3>Nysgjerrighet</h3>
              <p>Vi undersøker muligheter der andre ser avgrensninger.</p>
            </div>
            <div>
              <h3>Gjennomføring</h3>
              <p>Vi bringer ideer fra konsept til virkelighet.</p>
            </div>
            <div>
              <h3>Åpenhet</h3>
              <p>Vi deler innsikt og bygger på hverandres kompetanse.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
