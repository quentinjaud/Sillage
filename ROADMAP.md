# Navimeter — Roadmap

## Vision

Fusionner deux approches complémentaires en un seul outil :
- **Journal de bord** (inspiration Navygatio) : documenter ses navigations avec events, photos géolocalisées, organisation par bateaux et dossiers, partage public
- **Analyse de performance** (inspiration ChartedSails) : VMG, détection de legs/manoeuvres, données vent, polaires, comparaison multi-bateaux

Navimeter = **le carnet de bord intelligent du navigateur**.

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
- [ ] Build + deploy Railway validés

**Risques :** Prisma 7 ESM-only peut casser des dépendances. Auth.js v5 peer deps incompatibles Next 16 (overrides ou Better Auth).

## Phase 1 — Auth & Bateaux (v0.2)

- [x] Auth utilisateur (Better Auth — email/password)
- [x] Modèle Bateau : nom, classe, longueur
- [x] Page "Mes bateaux" : CRUD
- [x] Bibliothèque de traces liée au user connecté
- [x] Association trace → bateau
- [x] Espace admin : CRUD utilisateurs, transfert de traces, association bateaux
- [x] Role admin via ADMIN_EMAIL (env var)
- [ ] Admin : impersonation d'utilisateurs (voir l'app comme un autre user)

## Phase 2 — Bibliothèque de traces & Nettoyage (v0.3)

- [ ] Page bibliothèque `/traces` : liste des traces du user
- [ ] Import multi-fichiers (drag & drop)
- [ ] Association trace → bateau
- [ ] Détection automatique des points aberrants (pics de vitesse, sauts GPS)
- [ ] Vue nettoyage : carte + graphique avec points suspects en rouge
- [ ] Suppression de points / sélection de plage / interpolation
- [ ] Recalcul automatique des stats après nettoyage
- [ ] Export trace nettoyée (GPX propre)

## Phase 3 — Journal : dossiers & navigations (v0.4)

- [ ] Page journal `/journal` : arborescence dossiers + navigations
- [ ] Filtrage : par bateau, par type (solo/régate), par date, par dossier
- [ ] CRUD dossiers (un dossier = une "aventure" partageable)
- [ ] Créer une navigation : nom, date, ajouter 1+ trace depuis la bibliothèque
- [ ] Vue navigation : carte + timeline + replay animé (play/pause/vitesse)
- [ ] Curseur synchronisé graphique ↔ carte
- [ ] Entrées journal : notes texte + photos géolocalisées
- [ ] Mode édition post-nav

**Storage photos :** Railway Storage Buckets (S3-compatible, $0.015/GB/mois, egress gratuit)

## Phase 4 — Performance mono-trace (v0.5)

- [ ] Slider/toggle Journal ↔ Performance sur navigation solo
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

## Phase 5 — Mode régate & multi-bateaux (v0.6)

- [ ] Basculer une navigation en mode "régate"
- [ ] Ajouter des traces de concurrents avec bateaux invités (nom + couleur)
- [ ] Superposition synchronisée sur la carte (couleur par bateau)
- [ ] Panel instruments multi-bateaux
- [ ] Replay synchronisé + tableau comparatif par leg
- [ ] Timeline multi-traces

## Phase 6 — Polaires & Parcours (v0.7)

- [ ] Diagramme polaire (vitesse vs angle de vent)
- [ ] Polaires théoriques : import manuel (fichier .pol / CSV) + éditeur intégré
- [ ] Ratio performance réelle / polaire théorique
- [ ] Création de parcours : placement de marques/bouées
- [ ] Association parcours → navigation régate

## Phase 7 — Partage & Export (v0.8)

- [ ] Lien public par navigation (contrôle granulaire : journal, photos, stats, perf)
- [ ] Lien public par dossier/aventure (groupe de navigations)
- [ ] Vue publique read-only + vue aventure (carte récap + liste navs + journal)
- [ ] Export stats PDF + export image carte
- [ ] Embed iframe

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
