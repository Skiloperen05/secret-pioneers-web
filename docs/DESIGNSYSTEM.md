# Secret Pioneers: designsystem v0.1

## Prinsipper

- **Retning før dekor:** Store typografiske flater og få, men tydelige visuelle
  elementer lar ideene stå i sentrum.
- **Faglig, ikke formell:** Mørk blå, varm benhvit og dempet gull gir tyngde
  uten å bli bank- eller konsulentspråk.
- **Rom for idéer:** Stor luft, presise kanter og rolige overganger skaper den
  etterspurte høye takhøyden.

## Grunntokens

| Token    | Verdi            | Bruk                                            |
| -------- | ---------------- | ----------------------------------------------- |
| `ink`    | `#102B40`        | Tekst, mørke flater og primærknapp              |
| `canvas` | `#F4F2EC`        | Hovedbakgrunn                                   |
| `gold`   | `#B79748`        | Aksent, status og viktige lenker                |
| `muted`  | `#6E8290`        | Delere og sekundærinformasjon                   |
| Display  | Playfair Display | Overskrifter, identitet og redaksjonelt innhold |
| Sans     | DM Sans          | Navigasjon, tekst og skjema                     |
| Mono     | DM Mono          | Metadata, status og intern Studio-UI            |

## Navigasjonsskisse

```text
Offentlig: [Logo]  Prosjekter · Tjenester · Innsikt · Om oss  [Medlemsinnlogging]

Studio:    [SP]    Oversikt · Publisering · Prosjekter · Økonomi · Møter
                     Meldinger · Medlemmer · Innstillinger
```

Den kjørbare prototypen i `src/App.tsx` viser den offentlige startsiden og
en interaktiv forhåndsvisning av inngangen til Studio.
