# Sillage — Changelog

## v0.4.1 — Phase 3b : Vue navigation immersive (2026-03-22)

### Vue immersive
- Route `/navigation/[id]` : vue immersive distincte de `/trace/[id]`
- Composants partages entre les deux vues : TraceChart, PanneauStats, marqueur directionnel
- Edition inline des metadonnees (nom, date) depuis la vue navigation
- Breadcrumb dossier > aventure integre au panneau stats
- Bouton retour journal en haut a droite (jaune pastel)

### Graphique multi-donnees
- TraceChart remplace SpeedChart : supporte vitesse et cap GPS
- Axe X temporel numerique (proportionnel au temps, plus categoriel)
- Gradient de couleur vitesse applique sur toutes les donnees graphees (lecture croisee)
- Clic sur le graphique fixe le point actif, hover temporaire revient au fixe en sortie
- Slider thumb style Mantine sur l'axe X, draggable, avec barre de progression

### Marqueur directionnel
- Curseur bateau (coque vue de dessus) sur la carte, oriente selon le cap du point actif
- SVG jaune #F6BC00 avec contour blanc

### Panneau point actif
- Pills a fond noir semi-transparent, centrees en haut de la carte
- Position GPS en degres/minutes/milliemes, date/heure precise, vitesse et cap
- Clic sur vitesse/cap switch la donnee graphee

### Panneau stats
- Layout compact en lignes horizontales (remplace les cartes)
- Icone bateau (coque) + nom colore + bouton "+" (futur mode regate)

### Popup carte
- Popup amelioree : coins arrondis, icones, coordonnees GPS formatees
- Croix de fermeture en cercle noir externe
- Clic sur la trace fixe le point actif (synchronise avec thumb et pills)

### Composants partages
- Types `PointCarte` et `DonneeGraphee` extraits dans `src/lib/types.ts`
- Hook `useEtatVue` : etat centralise (pointFixe/pointSurvole, donneeGraphee, hauteur)
- `sousechantillonner` extrait dans `src/lib/utilitaires.ts`

### Nettoyage
- SpeedChart et StatsPanel remplaces par TraceChart et PanneauStats
- Timeline supprimee (l'axe X du graphique sert de timeline)
- Rules of Hooks corrige dans TraceMap (guard deplace apres les hooks)

## v0.4.0 — Phase 3a : Journal — dossiers & navigations (2026-03-22)

### Journal de bord
- Page `/journal` : organisation en dossiers, aventures et navigations
- Hierarchie Dossier → Aventure (optionnelle) → Navigation
- CRUD complet avec modales (creer, editer, supprimer)
- Association navigation → trace depuis la bibliotheque
- Panneau d'apercu lateral : mini-carte N&B + statistiques au survol
- Filtrage par bateau et type (solo/regate) dans les dossiers deplies

### Mini-carte d'apercu
- Tuiles OSM raster en noir & blanc (CSS grayscale)
- Trace coloree en SVG overlay (projection Web Mercator)
- Polyline simplifiee calculee a l'import (Ramer-Douglas-Peucker, 50-100 points)
- Superposition multi-traces pour les aventures

### Navigation
- Header reorganise : "Journal" en lien principal, "Mes traces" et "Mes bateaux" dans le dropdown utilisateur
- Redirection accueil vers `/journal` (au lieu de `/traces`)

### Schema
- Nouveaux modeles : Dossier, Aventure, Navigation (avec TypeNavigation enum)
- Champ `polylineSimplifiee` sur Trace

### API
- `GET/POST /api/journal/dossiers` — liste et creation de dossiers
- `PATCH/DELETE /api/journal/dossiers/[id]` — modification et suppression
- `GET /api/journal/dossiers/[id]/contenu` — contenu deplie
- `POST /api/journal/dossiers/[dossierId]/aventures` — creation aventure
- `PATCH/DELETE /api/journal/aventures/[id]` — modification et suppression
- `POST /api/journal/navigations` — creation navigation
- `PATCH/DELETE /api/journal/navigations/[id]` — modification et suppression

---

## v0.3.0 — Phase 2 : Bibliothèque de traces & Nettoyage (2026-03-22)

### Nettoyage de traces
- Détection automatique des points aberrants à l'import (pics de vitesse MAD, sauts GPS, timestamps anormaux, seuil absolu 50 kn)
- Page de nettoyage immersive `/trace/[id]/nettoyage` : carte plein écran + panneaux flottants
- Exclusion/inclusion de points par clic sur la carte ou sélection de plage sur le graphique
- Simplification de trace (Ramer-Douglas-Peucker) avec slider de tolérance
- Recalcul automatique des stats après nettoyage (côté client en temps réel + côté serveur à la sauvegarde)
- Curseur synchronisé carte ↔ graphique dans les deux sens
- Export GPX nettoyé (points non-exclus uniquement)

### Bibliothèque de traces
- Import multi-fichiers (drag & drop plusieurs GPX/KML, progression par fichier)
- Filtrage de la liste : recherche par nom, filtre par bateau, tri par date/distance/vitesse
- Bouton nettoyer dans la liste des traces

### Vue trace immersive
- Carte plein écran avec panneaux flottants (stats, graphique, contrôles)
- Graphique vitesse redimensionnable (drag handle)
- Gradient de couleur vitesse sur la ligne du graphique (même échelle que la carte)
- Titre de trace éditable au clic
- Contrôles carte custom : boutons ronds (zoom +/-, boussole, sélecteur de couches)
- Échelle nautique/métrique dynamique (bascule NM ↔ mètres sous 0.3 NM)
- Métadonnées dans le header (date de début, bateau)

### Qualité des données
- Filtrage des waypoints/POI dans le parser GPX (ne garde que les LineString)
- Lissage gaussien des vitesses à l'import (sigma=2)
- Détection des timestamps anormaux (delta < 0.5s, recul dans le temps)
- Couleurs vitesse centralisées (utilitaire partagé, HSL sat 80% / light 50%)

### API
- `PATCH /api/traces/[id]` — renommer une trace
- `PATCH /api/traces/[id]/points` — mise à jour bulk isExcluded + recalcul stats
- `GET /api/traces/[id]/export` — export GPX nettoyé

---

## v0.2.0 — Phase 1 : Auth & Bateaux (2025-08-21)

- Auth utilisateur (Better Auth — email/password)
- Modèle Bateau : nom, classe, longueur
- Page "Mes bateaux" : CRUD
- Bibliothèque de traces liée au user connecté
- Association trace → bateau
- Espace admin : CRUD utilisateurs, transfert de traces, association bateaux
- Role admin via ADMIN_EMAIL (env var)
- Admin : impersonation d'utilisateurs

---

## v0.1.1 — Phase 0 : Refactoring & Montée de versions

- Migration Next.js 15 → 16
- Migration Prisma 6 → 7 (ESM-only)
- Migration Leaflet → MapLibre GL JS (rendu WebGL)
- Intégration algos gpx.studio (MIT) : smoothing, Ramer-Douglas-Peucker, stats cumulatives
- Refactoring code : francisation, service d'import, logger, thème centralisé

---

## v0.1.0 — MVP

- Import de fichiers GPX et KML
- Détection automatique de la source (Navionics, SailGrib, Weather4D, OpenCPN, Garmin, Google Earth, Strava)
- Affichage de la trace sur carte maritime (OSM + OpenSeaMap)
- Coloration de la trace par vitesse
- Statistiques : distance (NM), durée, vitesse moy/max (kn)
- Graphique vitesse/temps
- Liste des traces + suppression
- Déploiement Railway
