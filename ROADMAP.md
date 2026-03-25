# Sillage — Roadmap

## Vision

Fusionner deux approches complémentaires en un seul outil :
- **Journal de bord** (inspiration Navygatio) : documenter ses navigations avec events, photos géolocalisées, organisation par bateaux et dossiers, partage public
- **Analyse de performance** (inspiration ChartedSails) : VMG, détection de legs/manoeuvres, données vent, polaires, comparaison multi-bateaux

Sillage = **le carnet de bord intelligent du navigateur**.

## Architecture des 3 espaces

```
BIBLIOTHÈQUE DE TRACES           JOURNAL DE BORD               ANALYSE
(matière première)               (organisation)                (exploitation)

Import GPX/KML ──→ Nettoyage     Dossiers / Aventures
                   ↓             └── Navigation "Solo"        ← slider Journal/Perf
                   Lier à un        └── trace nettoyée
                   bateau         └── Navigation "Régate"     ← multi-traces
                                     ├── ma trace
                                     ├── concurrent 1
                                     └── concurrent 2 (invité)
```

### Modèle de données

```
User
 ├── Boat[] (mes bateaux)
 ├── Trace[] (bibliothèque — matière première)
 │    └── TrackPoint[] (lat, lon, time, sog, cog, twd, tws, twa, vmg, isExcluded)
 └── Folder[] (dossiers journal / aventures)
      └── Navigation[] (solo ou régate)
           ├── NavigationTrace[] (pivot : trace + bateau ou bateau invité)
           ├── LogEntry[] (journal : texte, photos, timestamp, position)
           ├── Leg[] (analyse : upwind/downwind/reaching)
           └── Maneuver[] (analyse : virements, empannages)
```

**Trace brute vs nettoyée** : soft-delete (`isExcluded` sur TrackPoint) pour conserver les données originales. Les calculs ignorent les points exclus. L'export GPX propre ne contient que les points non-exclus.

**Bateau invité** : trace de concurrent sans compte — juste un nom + couleur dans `NavigationTrace`.

---

## MVP (v0.1) ✅

- [x] Import de fichiers GPX et KML
- [x] Détection automatique de la source (Navionics, SailGrib WR, Weather4D, Navimetrix, OpenCPN, Garmin, Google Earth, Strava)
- [x] Affichage de la trace sur carte maritime (OSM + OpenSeaMap)
- [x] Coloration de la trace par vitesse (bleu → rouge)
- [x] Statistiques de base : distance (NM), durée, vitesse moy/max (kn)
- [x] Graphique vitesse/temps
- [x] Liste des traces importées + suppression
- [x] Déploiement sur Railway

---

## Phase 0 — Refactoring & Montée de versions (v0.1.1)

- [x] Migration Next.js 15 → 16 (codemod automatique + adaptations manuelles)
- [x] Migration Prisma 6 → 7 (ESM-only, driver adapters, prisma.config.ts)
- [x] Migration Leaflet → **MapLibre GL JS** (rendu WebGL, gratuit — `react-map-gl/maplibre`)
  - OpenSeaMap en overlay raster sur fond raster MapLibre
  - SSR : même pattern `dynamic()` + `ssr: false`
- [x] Intégrer les algos de gpx.studio (MIT) : smoothing, Ramer-Douglas-Peucker, stats cumulatives
- [x] Refactoring code existant (francisation, dédoublonnage, service d'import, logger, thème centralisé, validations)
- [x] Build + deploy Railway validés

**Risques :** ~~Prisma 7 ESM-only peut casser des dépendances.~~ OK. ~~Auth.js v5 peer deps incompatibles Next 16~~ → Better Auth choisi, compatible.

## Phase 1 — Auth & Bateaux (v0.2)

- [x] Auth utilisateur (Better Auth — email/password)
- [x] Modèle Bateau : nom, classe, longueur
- [x] Page "Mes bateaux" : CRUD
- [x] Bibliothèque de traces liée au user connecté
- [x] Association trace → bateau
- [x] Espace admin : CRUD utilisateurs, transfert de traces, association bateaux
- [x] Role admin via ADMIN_EMAIL (env var)
- [x] Admin : impersonation d'utilisateurs (voir l'app comme un autre user)

## Phase 2 — Bibliothèque de traces & Nettoyage (v0.3)

- [ ] Page bibliothèque `/traces` : liste des traces du user
- [ ] Import multi-fichiers (drag & drop)
- [ ] Association trace → bateau
- [ ] Détection automatique des points aberrants (pics de vitesse, sauts GPS)
- [ ] Vue nettoyage : carte + graphique avec points suspects en rouge
- [ ] Suppression de points / sélection de plage / interpolation
- [ ] Recalcul automatique des stats après nettoyage
- [ ] Export trace nettoyée (GPX propre)

## Phase 3a — Journal : dossiers & navigations (v0.4)

- [x] Page journal `/journal` : cartes depliables (approche hybride)
- [x] Hierarchie Dossier → Aventure (optionnelle) → Navigation
- [x] CRUD dossiers, aventures, navigations
- [x] Association navigation → trace (1:1)
- [x] Panneau d'apercu lateral (mini-carte + stats au survol)
- [x] Mini-carte N&B (tuiles OSM + SVG, sans MapLibre)
- [x] Filtrage par bateau, type (solo/regate) dans les dossiers deplies
- [x] Header reorganise : Journal en nav principale, Traces/Bateaux dans dropdown user
- [x] Polyline simplifiee calculee a l'import (RDP)

## Phase 3b — Vue navigation immersive (v0.4.x)

- [ ] Route `/navigation/[id]` : vue immersive distincte de `/trace/[id]`
  - `/trace/[id]` = vue brute, nettoyage, edition GPS (depuis "Mes traces")
  - `/navigation/[id]` = meme carte/graphique + journalisation (depuis le journal)
- [ ] Vue navigation : carte + timeline (curseur manuel) + graphique multi-donnees (vitesse/cap)
- [ ] Curseur directionnel synchronise carte ↔ graphique ↔ timeline
- [ ] Panneau stats enrichi : stats globales + point actif, switch donnee graphee au clic
- [ ] Mode edition metadonnees (nom, date, type) depuis la vue navigation

## Phase 3c — Zoom temporel (v0.4.x) ✅

- [x] Curseurs de selection de plage temporelle sur le graphique (deux poignees draggables)
- [x] Filtrage de la trace carte : n'afficher que le segment correspondant a la plage selectionnee
- [x] Graphiques recharges sur la plage zoomee : echelle affinee
- [x] Affichage de la plage selectionnee (heure debut → heure fin, duree) dans le HUD
- [x] Reset rapide : double-clic ou bouton pour revenir a la trace complete
- [x] Interaction fluide : drag des curseurs avec apercu en temps reel sur carte et graphiques
- [ ] Zoom carte automatique : recentrer/rezoom sur le segment visible (fitBounds auto)

## Phase 3d — Entrees journal (v0.4.x)

- [x] Entrees journal : notes texte geolocalisees
- [x] Toggle Journal/Perf dans la barre d'outils NavVue
- [x] Timeline journal en zone C (bas) avec frise chronologique
- [ ] Entrees journal : photos geolocalisees
- [ ] Storage photos : Railway Storage Buckets (S3-compatible)

## Phase 4 — Performance mono-trace (v0.5)

- [x] ~~Slider/toggle Journal ↔ Performance sur navigation solo~~ (fait en Phase 3d)
- [ ] Enrichissement vent :
  - **Priorité 1** : extensions GPX (instruments à bord — données précises)
  - **Priorité 2** : open-meteo-archive (résolution ~25km/1h — tendance OK, pas fiable pour régate côtière)
  - ⚠️ Open-meteo gratuit pour usage non-commercial uniquement
- [ ] Calcul TWA et VMG
- [ ] Panel instruments : SOG, COG, VMG, TWA
- [ ] Détection de legs (upwind/downwind/reaching) et manoeuvres (tack/gybe)
- [ ] Affichage legs sur la timeline (bandes colorées)
- [ ] Stats par leg + graphique VMG/temps
- [ ] Affichage vent sur la carte
- [ ] HUD vent : source de donnees configurable — pointActif (prioritaire si curseur actif) ou centreCarte (fallback, interpole le vent au centre de la vue carte). Important pour grands parcours ou le vent varie spatialement et temporellement

## Phase 4b — Refonte accueil & navigation globale (v0.6) ✅

- [x] Carte OSM plein ecran avec tuiles desaturees
- [x] Arborescence flottante des journaux de bord (dossiers > navigations)
- [x] Recherche et filtres (par type, par bateau)
- [x] Aventures depliables (chevron + sous-navs)
- [x] Trace affichee a sa vraie position au clic + pills meta
- [x] Simplification modele : Aventure = type de Navigation
- [x] Migration Prisma (suppression modele Aventure)
- [x] Suppression header global → squiggle accueil + bouton user rond
- [x] Endpoint recalcul polylines manquantes

### A faire (polish accueil)
- [x] ~~"Mon port d'attache" dans settings utilisateur~~ (panneau preferences + clic carte + centrage)
- [x] ~~Traces / Bateaux en panneaux flottants depuis le menu user~~ (PanneauContext + zone D droite)
- [ ] Panneau Preferences (port d'attache, futures prefs)
- [ ] Drag-and-drop de navs entre dossiers et dans les aventures

---

## Phase 5 — Mode régate & multi-bateaux (v0.7)

- [ ] Basculer une navigation en mode "régate"
- [ ] Ajouter des traces de concurrents avec bateaux invités (nom + couleur)
- [ ] Superposition synchronisée sur la carte (couleur par bateau)
- [ ] Panel instruments multi-bateaux
- [ ] Replay synchronisé + tableau comparatif par leg
- [ ] Timeline multi-traces

## Phase 6 — Polaires & Parcours (v0.8)

- [ ] Diagramme polaire (vitesse vs angle de vent)
- [ ] Polaires théoriques : import manuel (fichier .pol / CSV) + éditeur intégré
- [ ] Import polaires depuis NavimetriX : reverse-engineer l'app Windows pour localiser les fichiers polaires (sur macOS : `~/Library/Application Support/Soft4Sail/NavimetriX/polars/`). NavimetriX prevoit un module polaires en T2 2026 — anticiper la compatibilite
- [ ] Ratio performance réelle / polaire théorique
- [ ] Création de parcours : placement de marques/bouées
- [ ] Association parcours → navigation régate

## Phase 7 — Partage & Export (v0.9)

- [x] Lien public par navigation (carte + stats + journal, read-only)
- [ ] Lien public par dossier/aventure (groupe de navigations)
- [ ] Vue publique par dossier/aventure (carte recap + liste navs + journal)
- [ ] Controle granulaire du partage (checkboxes : carte, stats, journal, graphique)
- [ ] Export stats PDF + export image carte
- [ ] Embed iframe

## Phase 8 — Import automatique Navimetrix (v1.0)

- [ ] Addon Navimetrix : streamer a la demande les traces + logs NMEA nouveaux depuis le dernier envoi, directement dans le compte de l'utilisateur sur Sillage
- [ ] Synchronisation incrementale (delta depuis le dernier sync)
- [ ] Import direct dans le journal de bord (creation automatique de navigations)

---

## Outils carte (backlog)

- [ ] **Outil mesure de distances** (inspiration Géovoile)
  - Placement de waypoints sur la carte → calcul distance totale + par segment
  - **Routes orthodromiques** (great circle) pour les grandes distances — pas de ligne droite Mercator
  - Affichage cap initial + cap final de chaque segment
  - HUD avec distance totale, segments, caps
  - Mode snap optionnel sur la trace existante
- [ ] Inspiration générale **Géovoile** pour les outils cartographiques interactifs

---

## Refactorings en attente

- [x] ~~Extraire `creerStyleCarte` en module partage~~ → `src/lib/maps/style-carte.ts`
- [x] ~~Constantes layer IDs MapLibre~~ → `src/lib/maps/layer-ids.ts`
- [x] ~~Generaliser `TitreEditable` avec callback `onSave`~~ → prop optionnelle `onSave`
- [ ] Extraire SVG marqueur bateau en composant (`MarqueurBateau.tsx`) — quand un second usage apparait
- [ ] Timeline : cleanup listeners `mousemove`/`mouseup` sur unmount (guard `useRef`)
- [x] ~~URLs humanisees : slug sur les navigations~~ → `src/lib/slug.ts`, champ `slug` sur Navigation
- [x] ~~Vue journal : navigateur dossiers/aventures/navs~~ → fait en v0.6 (ArborescenceJournal)

---

## Principes UX

- **Usage mixte desktop/tablette** : toute interaction hover doit avoir un equivalent tactile (tap, long-press, ou element toujours visible)
- **Taille minimale des cibles tactiles** : 44px minimum pour tout element cliquable ou draggable (Apple HIG). La zone de touch peut etre plus grande que l'element visible (padding, pseudo-elements, hit area invisible)

### Chantiers tablette (a integrer au fil des phases)

- [ ] Slider thumbs graphique et nettoyage : zone tactile 14px → 44px
- [ ] Resize handle graphique : zone de prise 3px → 44px
- [ ] Actions cartes journal (edit/delete) : toujours visibles, pas seulement au hover
- [ ] Curseur synchronise (pointSurvole) : equivalent tap pour consultation rapide sur tablette
- [ ] Boutons contextuels : padding 4px → zone tactile 44px minimum
- [ ] Boutons tri/filtre traces : agrandir la zone cliquable

---

## Références inspirantes

- **Navygatio** — journal de bord, organisation par navigations, events géolocalisés : https://navygatio.firebaseapp.com/
- **ChartedSails** — analyse de performance voile, VMG, legs, polaires : https://www.chartedsails.com/
- **NavimetriX (gserv viewer)** — visualisation de traces GPX, instruments NMEA : https://gserv.navimetrix.com/track_gpx_viewer/viewer.html
- **TravelMap** — assemblage de traces en vue aventure/voyage : https://travelmap.net/
  - Timeline verticale d'etapes (dots chronologiques, dates, photos, notes depliables par escale)
  - Carte recap avec segments entre etapes, legende par mode de transport
  - Pattern cible pour la vue Aventure de Sillage : navigations assemblees sur carte + timeline escales

---

## Décisions techniques

- **Stack** : Next.js 16 + React 19 + TypeScript + Mantine + CSS vanilla
- **BDD** : PostgreSQL via Prisma 7 (Railway)
- **Carte** : MapLibre GL JS + react-map-gl + OpenSeaMap (raster overlay)
- **Parsing** : @tmcw/togeojson (GPX/KML), algos gpx.studio (MIT) pour nettoyage/smoothing
- **Vent** : extensions GPX (priorité) + open-meteo-archive API (fallback, ~25km/1h)
- **Photos** : Railway Storage Buckets (S3-compatible)
- **Hébergement** : Railway
- **Police** : Atkinson Hyperlegible Next
- **Couleurs** : jaune #F6BC00, bleu #43728B, gris chauds, blanc crème #FFFDF9 (alignée sur Origami-voilier)
