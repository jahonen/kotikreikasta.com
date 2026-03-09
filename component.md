# Components Documentation

## MapPicker (beta)
- Lifecycle tag: beta
- Description: A reusable React component that loads Google Maps JavaScript API and Places (New) autocomplete to select a location. Renders a map with a draggable marker, supports search-driven selection, and performs reverse geocoding to emit structured address data in Finnish prioritization. Used in Admin ListingWizard and the /maptest page.

### Interface (required)
- Inputs
  - `lat?`: number – initial latitude
  - `lng?`: number – initial longitude
  - `onChange(loc)`: function – callback invoked whenever selection changes via search, click, or drag
- Outputs (via `onChange(loc)` argument)
  - `lat`: number
  - `lng`: number
  - `formattedAddress?`: string
  - `addressComponents?`: Array<{ types: string[]; longText?: string; shortText?: string }>
  - `geocodeResults?`: any[] – JSON-safe full reverse geocoding results for diagnostics/UI
- Side effects
  - Loads Google Maps JS with `language=fi` and libraries: `places` (+ `marker` only when `mapId` present)
  - Conditionally uses AdvancedMarkerElement when a map style `mapId` is configured; otherwise legacy Marker
  - Uses Places (New) `PlaceAutocompleteElement` for search
  - Performs reverse geocoding (prefers political results) after map interactions and place selections
  - Fetches the browser Maps JS key from `/api/maps/key` (Secret Manager backend)

### Behavior
- Initializes map after the container has a visible size to ensure tiles render reliably
- Supports:
  - Search selection → center & set marker, fetch fields from Place, then reverse geocode for complete results
  - Map click & marker drag → update position and reverse geocode
- Emits merged address components from all reverse-geocode results to preserve admin levels (region/island/etc.)
- Minimal console.info diagnostics for initialization and geocode events

### Address field mapping used by downstream UI
- Greek administrative hierarchy (Greece):
  - administrative_area_level_1 → Περιφέρεια (Perifereia) – FI: Lääni/Maakunta
  - administrative_area_level_2 → Περιφερειακή ενότητα (Perifereiakí Enótita) – FI: Alueyksikkö
  - administrative_area_level_3 → Δήμος (Dímos) – FI: Kunta
  - administrative_area_level_4 → Χωριό/Συνοικία (Chorió/Synoikía) – FI: Kylä/Lähiö
- Finnish UI display on /maptest (with Greek tooltips):
  - Katuosoite ("Οδός + Αριθμός") → `street_address` (fallback: `route` + `street_number`)
  - Kylä/Lähiö ("Τοπική Κοινότητα") → `locality`
  - Kunta ("Δήμος") → prefer `administrative_area_level_3`, fallback to `locality`/`postal_town`
  - Lääni ("Περιφέρεια") → prefer `administrative_area_level_1`, fallback: `administrative_area_level_2` → `island` → `administrative_area_level_4` → `locality`/`sublocality` (avoid duplication with Kunta)
  - Postinumero ("Ταχυδρομικός Κώδικας") → `postal_code`
  - Maa ("Χώρα") → `country`

### Dependencies
- Google Maps JavaScript API (libraries: places, marker)
- Places API (New)
- Geocoding API
- Secret Manager via `/app/api/maps/key` route

### Testing
- Vitest + jsdom configured in the project. Component logic designed to avoid stalling in test env (skips wait-for-size loop). Add unit tests for:
  - Emitting `onChange` on drag/click/selection
  - Admin level extraction from `addressComponents`
  - Fallback behavior when constructors are delayed

### Observability
- Logs start/ready and geocode events via `console.info` (no PII beyond formatted address).
- Consider adding analytics events on user interactions (search select, drag, click) per project policy.

## PointsOfInterestPicker (beta)
- Lifecycle tag: beta
- Description: Hakee lähellä olevat kiinnostavat kohteet (POI) Google Places API (New) -rajapinnan kautta ja näyttää ne valintaruudukossa suomalaisilla tyyppilabeleilla. Käytössä `/maptest`-sivulla ja yhdistettävissä `MapPicker`iin valitun sijainnin perusteella.

### Interface (required)
- Inputs
  - `center`: `{ lat: number; lng: number }` – hakualueen keskipiste
  - `radius?`: number – hakuympyrän säde metreinä (oletus ~2000 m)
  - `includedTypes?`: string[] – suodatettavat Place-tyypit
- Outputs
  - Renderöity UI, joka listaa `places` (nimi, tyyppi, sijainti) ja valintaruudut kohteiden poimintaan
- Side effects
  - Tekee `POST`-kutsun taustapalveluun `NEXT_PUBLIC_PLACES_ENDPOINT` (oletus `/api/places/nearby`)
  - Dedupoi ja peruu päällekkäiset haut `AbortController`illa, jos koordinaatit eivät muutu
  - Näyttää lataus- ja virhetilat

### Dependencies
- Places API (New) taustapalvelun kautta
- Firebase Hosting rewrite → Cloud Run `places-nearby`

### Behavior
- Muodostaa pyynnön: `{ center: { lat, lng }, radius }`
- Kartoitus suomenkielisiin tyyppilabeleihin (esim. `restaurant` → `Ravintola`, `pharmacy` → `Apteekki`)
- Näyttää listan; valitut kohteet välitettävissä yläkomponentille (käyttökohteesta riippuen)

### Testing
- Vitest-yksikkötestit kattavat:
  - POI-listan renderöinti mockatulla vastauksella
  - Pyyntöjen deduplikointi, kun `center`-objektin identiteetti vaihtuu, mutta koordinaatit pysyvät samoina

### Observability
- Kevyt lokitus kehitystä varten; ei tulosteta PII:tä
