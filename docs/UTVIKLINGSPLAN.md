# Utviklingsplan: Secret Pioneers

**Status:** Fase 0 gjennomført 21. september 2026. Fase 1 er neste steg.

**Mål:** Et profesjonelt digitalt hjem for Secret Pioneers med en åpen,
offentlig profil og et sikkert, medlemsstyrt arbeidsrom. Innhold som publiseres
fra arbeidsrommet skal kunne vises på den åpne siden umiddelbart.

---

## 1. Produktet vi bygger

Løsningen består av én nettapplikasjon med to tydelig adskilte flater:

| Flate                  | Målgruppe                                             | Formål                                                                     |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| **Åpen UI**            | Besøkende, potensielle klienter og samarbeidspartnere | Presentere Secret Pioneers, prosjekter, tjenester, medlemmer og innsikt.   |
| **Lukket UI / Studio** | Inviterte medlemmer                                   | Arbeidsrom for drift, samarbeid og publisering. Tilgang krever innlogging. |

Den åpne flaten skal ha et rolig, moderne og intuitivt uttrykk. Studioet skal
prioritere oversikt, kontroll og enkel samhandling. Vi behandler disse som to
opplevelser i samme produkt, ikke som en offentlig side med et tilfeldig
administrasjonspanel lagt oppå.

### 1.1 Åpen UI: første innholdsområder

- Forside med tydelig posisjonering, utvalgte initiativer og kontaktpunkt.
- Om oss: formål, retning og grunnleggere.
- Prosjekter: publiserte aktive, fullførte og eventuelt kommersielle oppdrag.
- Tjenester / nettsider for klienter, med relevante caser når de finnes.
- Innsikt: artikler, analyser og korte oppdateringer.
- Kontakt og forespørselsskjema.

Alle poster som kommer fra Studio har utkast-, gjennomgangs- og publisert
status. Kun eksplisitt publiserte poster kan leses av anonyme besøkende.

### 1.2 Lukket UI: første arbeidsområder

- **Oversikt:** egne oppgaver, oppdateringer, kommende møter og prosjektstatus.
- **Publisering:** redaktørpanel for den åpne siden med forhåndsvisning og
  publiser / avpubliser.
- **Prosjekter:** interne og offentlige prosjekter, oppgaver, medlemmer,
  dokumenter, kommentarer og status.
- **Økonomi:** budsjettlinjer, inntekter/kostnader, vedlegg og oversikter.
  Dette er et internt styringsbilde; eventuell pliktig bokføring beholdes i et
  dedikert regnskapssystem.
- **Medlemmer og roller:** profil, medlemsstatus, kompetanse og tilganger.
- **Styremøter:** agenda, møte, referat, beslutninger, oppfølging og vedlegg.
- **Meldinger:** kanaler, direktemeldinger, gruppemeldinger, varslinger og
  nærvær.
- **Møter:** planlegging av gruppesamtaler og digitale møterom.

Prosjekter får en synlighetsinnstilling: `internal`, `private` eller `public`.
`internal` er som hovedregel for alle medlemmer; `private` er begrenset til
utvalgte deltakere; `public` er kandidater for eksponering på den åpne siden,
men blir ikke synlige før de publiseres.

---

## 2. Foreslått teknisk arkitektur

### 2.1 Teknologivalg

| Lag                | Valg                                                             | Begrunnelse                                                                   |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Klient             | React + TypeScript + Vite                                        | Rask, typet og fullt statisk bygbar klient som fungerer godt på GitHub Pages. |
| Navigasjon og UI   | React Router, Tailwind CSS og et tilgjengelig komponentbibliotek | Skiller åpen side og Studio ryddig, samtidig som designet holdes konsekvent.  |
| Tilstand og skjema | TanStack Query + React Hook Form + Zod                           | Gir cache, sanntidssynkronisering og validerte redigeringsskjemaer.           |
| Backend            | Supabase: Postgres, Auth, Realtime, Storage og Edge Functions    | Ett integrert lag for data, tilgang, filer og live-funksjoner.                |
| Publisering        | GitHub-repositorium + GitHub Actions + GitHub Pages              | Bygger og publiserer den statiske klienten fra `main`.                        |
| Feil og drift      | Sentry (etter MVP) og Supabase-logg / audit trail                | Gjør feil og viktige handlinger sporbare.                                     |

Vi bruker Node.js 22 eller nyere i lokal utvikling og CI. Supabase-klientene
forutsetter dette etter at støtten for Node.js 20 ble avviklet i 2026.

### 2.2 Todelt arkitektur

```text
Besøkende ───────────────> Åpen React-klient på secretpioneers.no
                                  │ leser bare publisert innhold
                                  ▼
                             Supabase Postgres / Storage
                                  ▲
Medlemmer ── innlogging ─> Studio (/studio) ───┘
                                  │
                                  ├─ Realtime: innhold, chat, varsler, nærvær
                                  └─ Edge Functions: invitasjoner, varsling,
                                     privilegerte operasjoner og integrasjoner
```

GitHub Pages er kun vertskap for bygde HTML-, CSS- og JavaScript-filer. Det
skal aldri lagres databasepassord, `service_role`-nøkler eller annen hemmelig
serverkonfigurasjon i GitHub Pages-klienten. Slike operasjoner gjøres i
Supabase Edge Functions. Den offentlige Supabase-nøkkelen kan ligge i klienten
fordi databasen sikres med Row Level Security (RLS), ikke med hemmelighold av
den nøkkelen.

### 2.3 Domener og ruter

- `https://secretpioneers.no` er den offentlige siden.
- `https://www.secretpioneers.no` omdirigeres til hoveddomenet.
- `https://secretpioneers.no/studio` er den lukkede flaten.
- `https://secretpioneers.no/login` er innlogging og invitasjonsmottak.

Et alternativ er senere å flytte Studio til `studio.secretpioneers.no`. Vi
starter med `/studio` for én sammenhengende applikasjon og færre domene- og
cookieinnstillinger.

GitHub Actions bygger appen og publiserer artefakten ved push til `main`.
Custom domain konfigureres både hos DNS-leverandøren og i GitHub Pages-
innstillingene. Vi slår på HTTPS etter at DNS er validert.

---

## 3. Informasjonsarkitektur og designretning

### 3.1 Åpen UI

**Navigasjon:** `Hjem` · `Prosjekter` · `Tjenester` · `Innsikt` · `Om oss` ·
`Kontakt` · diskret `Medlem-innlogging`.

**Visuell retning:** Mørk og varm nøytral base, lys typografi, ett kontrollert
aksentfargevalg og god luft. Uttrykket skal signalisere nysgjerrighet,
faglighet og fremdrift – ikke et generisk konsulentselskap eller en student-
organisasjon. Før utvikling av sider etableres fargepalett, typografisk skala,
spacing, knapper, kort, tabeller og tomtilstander som ett designsystem.

**Tilgjengelighet:** Tastaturnavigasjon, synlige fokusmarkeringer, semantiske
landemerker, tilstrekkelig kontrast og god mobilopplevelse er
akseptansekriterier, ikke etterarbeid.

### 3.2 Studio

**Primærnavigasjon:** Oversikt · Publisering · Prosjekter · Økonomi · Møter ·
Meldinger · Medlemmer · Innstillinger.

Studio har en fast sidekolonne på store skjermer og mobiltilpasset meny. Hver
arbeidsflate skal inneholde:

- tydelig aktuelt ansvar og status,
- søk, filtre og relevante tomtilstander,
- aktivitetshistorikk der endringer er viktige,
- oppdatert tilgangskontroll før en handling utføres.

---

## 4. Tilgangsmodell

### 4.1 Roller

Roller er organisasjonsroller, ikke frie strenger i klienten. Et medlem kan ha
flere roller, og prosjektroller kan være mer avgrensede enn globale roller.

| Rolle          | Kan                                                                    | Kan ikke uten ekstra prosjektrolle    |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| `owner`        | Full administrasjon, roller, medlemmer, innstillinger og revisjonslogg | –                                     |
| `admin`        | Administrere innhold, prosjekter, medlemmer og møter                   | Endre/revokere owner-tilgang          |
| `editor`       | Lage, redigere og publisere offentlig innhold                          | Endre roller eller økonomitilganger   |
| `finance`      | Se og redigere økonomiområdet, relevante vedlegg og rapporter          | Administrere andre moduler            |
| `project_lead` | Opprette og styre egne prosjekter og deltakere                         | Se private prosjekter uten medlemskap |
| `member`       | Delta i tillatte prosjekter, meldinger og møter                        | Endre organisasjonsinnstillinger      |
| `guest`        | Se eksplisitt delte prosjektflater                                     | Se medlems- eller økonomiområder      |

Alle autorisasjonsavgjørelser kontrolleres i databasen med RLS. Frontendens
skjuling av en knapp er kun brukeropplevelse, ikke sikkerhet.

### 4.2 Medlemslivssyklus

1. Owner/admin oppretter en tidsbegrenset invitasjon med ønsket rolle.
2. Inviterte logger inn med e-postbasert magic link eller Google-innlogging.
3. En profil kobles til auth-brukeren, og aktivt medlemskap opprettes.
4. Ved rolleendring eller avsluttet medlemskap blir tilganger oppdatert.
5. Avslutning skal også stenge aktive økter ved sensitive behov og beholdes i
   revisjonsloggen.

MVP velger e-postbasert magic link som primærflyt: få passord, lav
administrasjon og enkel invitasjon. Google OAuth kan legges til hvis gruppen
vil bruke NHH-/Gmail-kontoer som standard. MFA tilbys først til owner/admin.

---

## 5. Datamodell

Dette er det planlagte domenet. Endelig SQL opprettes i versjonerte Supabase-
migrasjoner etter at vi har etablert prosjektet.

### 5.1 Identitet og organisasjon

| Tabell             | Nøkkelinnhold                                                           |
| ------------------ | ----------------------------------------------------------------------- |
| `profiles`         | `id` (koblet til `auth.users`), navn, avatar, bio, kontaktinnstillinger |
| `organizations`    | Secret Pioneers som organisasjon, konfigurasjon                         |
| `memberships`      | organisasjon, profil, status, innmeldt/avsluttet                        |
| `roles`            | rolledefinisjoner                                                       |
| `membership_roles` | medlemskap ↔ rolle                                                      |
| `invitations`      | invitert e-post, rolle, token-hash, utløp, status                       |
| `audit_events`     | hvem gjorde hva, måltype/-id, tidspunkt og minimale metadata            |

### 5.2 Publisert innhold

| Tabell              | Nøkkelinnhold                                                    |
| ------------------- | ---------------------------------------------------------------- |
| `site_settings`     | navigasjon, kontaktinfo, forside- og SEO-innstillinger           |
| `content_pages`     | om-side, tjenesteside og redigerbare modulsider                  |
| `projects`          | tittel, sammendrag, synlighet, status, eiere, publiseringsstatus |
| `project_members`   | prosjekt ↔ medlem, lokal rolle                                   |
| `project_updates`   | interne fremdriftsoppdateringer                                  |
| `articles`          | innsiktsposter, forfatter, innhold, publiseringsdato             |
| `service_offerings` | tjenester og klientrelaterte presentasjoner                      |
| `media_assets`      | filmetadata, alt-tekst, kreditering og Storage-objektsti         |

Innhold lagres som strukturert JSON-blokker eller Markdown med kontrollert
rendering, ikke som fri HTML. Det reduserer XSS-risiko og gjør gjenbruk i kort,
sider og forhåndsvisning mulig.

### 5.3 Drift og samarbeid

| Tabell            | Nøkkelinnhold                                            |
| ----------------- | -------------------------------------------------------- |
| `tasks`           | prosjekt, ansvarlig, frist, prioritet, status            |
| `meetings`        | type, tidspunkt, deltakere, agenda, møtelenke            |
| `meeting_minutes` | referat, beslutninger og publiseringsstatus              |
| `decisions`       | vedtak, eier, frist og kilde til møte                    |
| `channels`        | direktemelding, gruppe eller prosjektkanal               |
| `channel_members` | kanal ↔ medlem                                           |
| `messages`        | kanal, avsender, tekst, vedlegg, redigert/slettet-status |
| `notifications`   | mottaker, type, lenke, lest-status                       |

### 5.4 Økonomi

| Tabell                     | Nøkkelinnhold                                            |
| -------------------------- | -------------------------------------------------------- |
| `finance_accounts`         | kontonavn, kategori, periode og tilgangsområde           |
| `finance_entries`          | dato, beløp, type, konto, prosjekt, leverandør og status |
| `budgets` / `budget_lines` | budsjettperiode, kategori og forventet beløp             |
| `finance_attachments`      | kvittering/faktura i privat Storage-bøtte                |

Regnskap lagres aldri som fritt delte dokumenter. Avansert økonomitilgang gis
kun til `owner`, `admin` og `finance`, med særskilt RLS og revisjonshendelser.

---

## 6. Sanntid og publiseringsflyt

### 6.1 Offentlig innhold i sanntid

1. Redaktør redigerer en forhåndsvisning i Studio.
2. Endringer lagres som utkast og er private.
3. Redaktør klikker **Publiser**. Transaksjonen setter `published_at` og status
   til `published`.
4. Den åpne klienten lytter på endringer av publiserte rader gjennom Supabase
   Realtime.
5. Berørte komponenter henter frisk data og oppdateres uten GitHub-deploy.

Rollback er en eksplisitt funksjon: publisering skal opprette en
innholdsversjon, slik at en redaktør kan gjenopprette tidligere publisert
variant. GitHub brukes for kode; databasen håndterer innholdsversjoner.

### 6.2 Samarbeid i sanntid

| Behov                     | Mekanisme                              | Første leveranse                                      |
| ------------------------- | -------------------------------------- | ----------------------------------------------------- |
| Chat og varsler           | Postgres + Realtime databaseendringer  | Nye meldinger og lest-status oppdateres live.         |
| Nærvær                    | Realtime Presence                      | Viser hvem som er aktiv i en kanal eller et prosjekt. |
| Skriverindikator          | Realtime Broadcast                     | Midlertidig signal, ikke lagret som data.             |
| Felles dokumentredigering | Versjoner + enkel redigeringslås først | Full CRDT-redigering vurderes senere.                 |
| Video-/gruppesamtale      | Ekstern WebRTC-tjeneste                | Planlegg møte og åpne sikkert møterom i fase 3.       |

Supabase Realtime passer for meldinger, databaseendringer og nærvær. Selve
video- og lydtrafikken skal ikke forsøkes løst bare med databasen. Før
implementering velger vi mellom for eksempel Daily og LiveKit ut fra kostnad,
opptak, deltakergrense og personvernbehov. Møteromtoken skal utstedes fra en
Edge Function, aldri fra nettleseren med en leverandørhemmelighet.

---

## 7. Sikkerhet, personvern og drift

### 7.1 Ufravikelige krav

- RLS aktiveres på alle eksponerte tabeller, inkludert Storage-policyer.
- Hver RLS-policy bygger på medlemskap, rolle og eventuelt prosjektmedlemskap;
  aldri kun «innlogget bruker».
- `service_role` og andre hemmeligheter holdes kun i Supabase-miljøet/GitHub
  Actions-secrets når det er nødvendig – aldri i frontend eller repo.
- Private Storage-bøtter brukes for referater, økonomibilag og interne filer.
  Filer deles med tidsbegrensede signed URLs eller RLS-kontrollert tilgang.
- Auth-redirects begrenses til utviklings- og produksjonsdomener.
- Invitasjonstokener lagres som hash med utløpstid og kan tilbakekalles.
- HTML fra innholdsredigering saniteres/unngås; render kun godkjente blokker.
- Alle roller, medlemsendringer, publiseringer og økonomiske endringer fører
  til audit-hendelser.
- Daglig databasebackup-/gjenopprettingsstrategi, eksport av kritiske
  referater og regelmessig tilgangsrevisjon dokumenteres før produksjon.

### 7.2 Test av tilganger

For hver tabell og Storage-bøtte skriver vi både «tillat»- og «avvis»-tester:

- Uautentisert bruker ser kun publisert offentlig innhold.
- Medlem ser ikke økonomi eller private prosjekter uten eksplisitt rettighet.
- Prosjektleder kan ikke endre deltakelse i andres private prosjekt.
- Editor kan ikke tildele seg selv adminrolle.
- Bruker som er fjernet fra et prosjekt mister fil-, chat- og dataadgang.

Før hver produksjonsrelease kjøres lint, typekontroll, enhetstester,
end-to-end-tester av innlogging/publisering og gjennomgang av Supabase
Database Advisors.

---

## 8. Leveranseplan

Rekkefølgen er bevisst: en sikker kjerne og et brukbart publiseringssystem
kommer før et omfattende samarbeidsverktøy.

### Fase 0 – Avklaringer og etablering

**Leveranse:** Fundament klart for produktutvikling.

1. Opprette et nytt GitHub-repositorium for `secret-pioneers-web`.
2. Initialisere React/TypeScript/Vite, linting, formattering, tester og
   pre-commit-kontroller.
3. Koble nettstedet til det eksisterende EU-baserte Supabase-prosjektet med et
   eget, `sp_`-prefikset datadomene, RLS og privat fillagring. Et separat
   utviklingsmiljø vurderes når prosjektet trenger staging/branching.
4. Konfigurere GitHub Actions for kvalitetssjekker og forhåndsvisning av PR-er.
5. Konfigurere GitHub Pages-produksjonsdeploy og verifisere
   `secretpioneers.no` før DNS-omlegging.
6. Lage designsystem og klikkbar informasjonshierarki-skisse.
7. Avklare e-postavsender (custom SMTP), hvilken innloggingsmetode gruppen
   velger og hvem som er første owner.

**Etablert 21. september 2026:** GitHub-repositorium, React/TypeScript/Vite,
kvalitetssjekker, GitHub Pages-deploy, designsystem, offentlig startsidemal og
Supabase-fundament er på plass. Produksjon bruker offentlige GitHub-variabler,
RLS-beskyttede `sp_`-tabeller, privat `sp-media`-lagring og tillatte
innloggingsreturer for `secretpioneers.no`. GitHub Pages har et gyldig
Let's Encrypt-sertifikat, håndhever HTTPS og videresender `www` sikkert til
hoveddomenet.

### Fase 1 – Offentlig side og sikker publisering (MVP)

**Leveranse:** En ferdig presentasjonsside som Secret Pioneers selv kan
oppdatere.

1. Implementere visuelt designsystem og responsive offentlige sider.
2. Bygge Supabase-skjema for profiler, roller, nettsideinnhold, prosjekter,
   artikler og media.
3. Implementere Auth, invitasjoner, profil og rollebeskyttet `/studio`.
4. Bygge publiseringspanel for forside, prosjekter, tjenester og innsikt.
5. Lage utkast, forhåndsvisning, publiser/avpubliser og versjonshistorikk.
6. Koble den åpne siden til publisert innhold og Realtime-oppdatering.
7. Legge inn kontaktskjema via Edge Function med rate limiting og spamvern.
8. Skrive RLS-, Storage- og publiseringstester.

**Ferdig når:** En editor kan opprette et prosjekt, laste opp et bilde,
forhåndsvise og publisere det; en anonym besøkende ser endringen umiddelbart,
men aldri utkast eller internt innhold.

### Fase 2 – Prosjekter, møter og medlemsarbeidsrom

**Leveranse:** Et ryddig operativt arbeidsrom.

1. Prosjektoversikt med synlighet, medlemmer, ansvar, oppgaver, frister og
   dokumenter.
2. Medlemskatalog, roller og enkel administrasjon av invitasjoner.
3. Styremøte-modul med agenda, referat, beslutninger og oppfølgingspunkter.
4. Filområde med private og prosjektavgrensede Storage-policyer.
5. Oversiktsside med «mine oppgaver», nye aktiviteter og kommende møter.
6. Varslinger i appen og e-post for viktige invitasjoner/oppgaver.

**Ferdig når:** Et privat prosjekt kan gjennomføres fra opprettelse via oppgave
og referat til arkivering, uten at data blir synlig i offentlig UI eller for
uautoriserte medlemmer.

### Fase 3 – Økonomi, meldinger og digitale møter

**Leveranse:** Samhandlings- og styringsfunksjoner for gruppen.

1. Økonomimodul med budsjett, poster, vedlegg, prosjektkobling og
   rollebegrenset rapportering.
2. Direkte- og gruppemeldinger, kanaler, filvedlegg, varslinger og nærvær.
3. Møteplanlegging med kalenderfil/ekstern kalenderintegrasjon ved behov.
4. Valgt videoleverandør integrert med sikre, kortlivede møtetokener.
5. Søk på tvers av prosjekter, referater og innhold, med tilgang filtrert i
   databasen.

**Ferdig når:** Medlemmer kan samarbeide i avgrensede kanaler, følge opp
beslutninger og ha digitale gruppemøter uten å dele rom eller filer med feil
deltakere.

### Fase 4 – Modning og videreutvikling

**Leveranse:** Driftssikkert produkt med gode administrative rutiner.

1. Mobilpolering, PWA-støtte og eventuelt push-varsler.
2. Avanserte innsiktsdashbord og prosjekt-/økonomi-rapporter.
3. Revisjonsloggvisning, dataeksport, backupøvelser og tilgangsrevisjon.
4. SEO, ytelse, tilgjengelighetsrevisjon og sikkerhetstesting.
5. Avklarte integrasjoner: regnskap, kalender, e-post og videomøte.

---

## 9. Repositorium og miljøer

```text
secret-pioneers-web/
├── src/
│   ├── public-site/       # Åpen UI
│   ├── studio/            # Lukket UI
│   ├── components/        # Felles designsystem
│   ├── lib/               # Supabase-klient, validering, hjelpefunksjoner
│   └── routes/
├── supabase/
│   ├── migrations/        # Versjonert databaseskjema og RLS
│   ├── functions/         # Edge Functions
│   └── seed.sql           # Kun ikke-sensitiv utviklingsdata
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── rls/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy-pages.yml
├── docs/
└── AGENTS.md
```

Vi bruker tre klart separerte miljøer:

| Miljø      | Formål                   | Regel                                                             |
| ---------- | ------------------------ | ----------------------------------------------------------------- |
| Lokal      | Rask utvikling og tester | Dummydata, aldri reelle medlems-/økonomidata.                     |
| Staging    | PR-/akseptansetesting    | Egen Supabase-instans og testkontoer.                             |
| Produksjon | `secretpioneers.no`      | Kun `main`, gjennomgåtte migrasjoner og begrensede hemmeligheter. |

---

## 10. Beslutninger som må tas før eller i fase 0

| Beslutning                    | Anbefaling                                              | Hvorfor den betyr noe                                                 |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| GitHub-eier                   | Organisasjon `secret-pioneers`, ikke personlig konto    | Eierskap og tilgang kan overleve enkeltpersoner.                      |
| Supabase-region og abonnement | EU-region; velg plan ut fra lagring, MAU og backupbehov | Persondata og driftskostnad.                                          |
| Primær innlogging             | Magic link først, Google som valgfritt tillegg          | Påvirker invitasjonsflyt og SMTP.                                     |
| E-postavsender                | `hello@secretpioneers.no` eller dedikert auth-avsender  | Påkrevd for troverdige invitasjoner og produksjonsklar Auth.          |
| Videoløsning                  | Avgjøres i fase 3                                       | Kostnad, personvern og møtekvalitet varierer.                         |
| Regnskapsintegrasjon          | Manuell oversikt først; integrasjon senere              | Hindrer at MVP bygger en ufullstendig erstatning for regnskapssystem. |
| Innholdsansvar                | Utpek minst én editor og én owner                       | Sikrer at publisering og tilgang ikke blir personavhengig.            |

---

## 11. Første konkrete utviklingsoppgave

Når planen godkjennes, starter vi med **Fase 0, punkt 1–4**:

1. Initialisere et privat eller offentlig GitHub-repositorium med React,
   TypeScript og Vite.
2. Legge inn grunnleggende designsystem og skallet for åpen UI og Studio.
3. Opprette Supabase-prosjekt og lokalt migrasjonsoppsett uten å legge
   hemmeligheter i repoet.
4. Implementere CI som kjører typekontroll, lint og tester på hver pull request.

Deretter bygger vi én komplett vertikal flyt: **innlogget editor → opprett
prosjektutkast → publiser → umiddelbar visning på åpen side**. Den flyten er
grunnmuren for resten av systemet.

---

## 12. Arbeidsprinsipper for videre utvikling

- Bygg vertikalt og lever brukbare deler; unngå å lage alle datatabeller før
  første publiseringsflyt virker.
- Hver ny modul starter med brukerroller, dataeierskap og RLS før UI-kode.
- Skjult prosjektinnhold er skjult i databasen, ikke bare i navigasjonen.
- Hold designet enkelt nok til at innholdet og arbeidet får oppmerksomheten.
- Dokumenter viktige produktvalg, migrasjoner og endringer i denne mappen.
- Ikke publiser til produksjon direkte fra en lokal maskin; `main` og GitHub
  Actions er eneste produksjonsvei etter oppsett.
