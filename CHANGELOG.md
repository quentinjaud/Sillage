# Sillage — Changelog

## v0.6.2 — Editeur de polaires standalone + references roadmap (2026-03-25)

### Editeur de polaires (`src/polaires-standalone/`)
- Outil standalone HTML/CSS/JS — visualisation et edition de polaires au format .POL (NavimetriX)
- Diagramme polaire SVG interactif avec courbes par TWS, legende cliquable
- Tableau editable (TWA x TWS) avec ajout/suppression de lignes et colonnes
- Import/export fichiers .POL
- Bibliotheque de 496 polaires de reference integree (`polarlib/`)
- Comparaison avec polaire de reference (mode absolu / delta)
- Support vent apparent (TWA → AWA)
- Charte Sillage (Atkinson Hyperlegible, palette jaune/bleu/creme)

### Roadmap
- Ajout section "References inspirantes" (Navygatio, ChartedSails, NavimetriX, TravelMap)

## v0.6.1 — Session nuit : refactorings, panneaux, UX (2026-03-25)

### Refactorings techniques
- `creerStyleCarte()` extrait en module partage (`src/lib/maps/style-carte.ts`) — 3 variantes (base, satellite, desaturation)
- Layer IDs MapLibre centralises (`src/lib/maps/layer-ids.ts`) — plus de strings magiques
- `TitreEditable` generique avec callback `onSave` optionnel

### Cibles tactiles 44px
- Chevron arborescence : 32px → 44px
- Bouton "Ouvrir" barre meta : 36px → 44px
- Boutons tri/filtre traces + input recherche : min-height 44px

### Couleur d'accent par type de navigation
- CSS variable `--accent-nav` settee dynamiquement selon le type (SOLO=bleu, AVENTURE=rouge, REGATE=jaune)
- Badge type (pill) a cote du nom dans NavVue
- Bordure gauche coloree sur le breadcrumb
- Couleur bateau dynamique au lieu de #F6BC00 hardcode

### Barre d'outils flottante
- Composant `BarreOutils` generique (zone A, sous les stats)
- TraceVue : boutons Nettoyer, Editer, Lier a une navigation
- NavVue : boutons Partager, Editer meta

### Panneaux flottants (zone D)
- `PanneauContext` global avec provider dans layout
- Panneau Traces et Bateaux a droite de l'ecran, ouverts depuis le menu user
- Fonctionnent sur toutes les vues (accueil, TraceVue, NavVue)
- Menu user : "Mes traces" et "Mes bateaux" ouvrent les panneaux au lieu de naviguer
- Nouveau item "Preferences" dans le menu

### Panneau preferences + port d'attache
- Migration Prisma : `portAttacheLat/Lon/Nom` sur User
- API `GET/PATCH /api/user/preferences`
- Panneau preferences avec section port d'attache (nom, coords, bouton placer)
- Mode clic carte : curseur crosshair, clic = sauvegarde position
- Marqueur ancre sur la carte pour le port d'attache
- Centrage carte au demarrage sur le port d'attache si defini

### URLs humanisees
- Champ `slug` sur Navigation (unique, genere a la creation et au rename)
- Utilitaire `genererSlug()` (strip accents, lowercase, tirets)
- Route `/navigation/[id]` accepte ID ou slug
- Liens dans l'accueil utilisent le slug

### Zoom temporel (Phase 3c)
- Hook `useZoomTemporel` : plage temporelle (debut/fin timestamps)
- Double thumb sur TraceChart pour selection de plage
- Highlight semi-transparent entre les thumbs
- HUD plage (heure debut → fin, duree, bouton reset)
- Double-clic = reset du zoom
- Carte filtre les points quand le zoom est actif
- Integre dans TraceVue et NavVue

### Entrees journal texte (Phase 3d MVP)
- Modele `EntreeJournal` (Prisma) : texte, timestamp, lat/lon
- API CRUD : `GET/POST /navigations/[id]/entrees`, `PATCH/DELETE /entrees/[id]`
- TimelineJournal : frise chronologique + detail entree + formulaire inline
- Toggle Journal/Perf dans la barre d'outils NavVue
- Zone C bascule entre graphique performance et timeline journal
- Clic sur une entree saute au point GPS correspondant

### Lien de partage public (Phase 7 MVP)
- Champ `shareToken` sur Navigation (unique, genere a la demande)
- API `POST /navigations/[id]/partage` : genere/revoque le token
- Vue publique `/partage/[token]` : carte + stats + graphique + journal (read-only)
- Bouton Partager dans la barre d'outils NavVue : genere + copie le lien
- Composant `NavigationPubliqueClient` reutilisant les composants existants

## v0.6.0 — Refonte accueil carte OSM (2026-03-24)

### Nouvelle page d'accueil
- Carte OSM plein ecran (tuiles desaturees teintees creme)
- Arborescence flottante des journaux de bord (dossiers > navigations)
- Recherche et filtres (par type : solo/aventure/regate, par bateau)
- Clic sur une navigation : trace affichee a sa vraie position + pills meta (date, distance, duree, bateau)
- Aventures depliables dans l'arborescence (chevron + sous-navs)
- Bouton "Ouvrir" pour lancer la vue navigation complete

### Codes couleur par type
- Bleu (#43728B) — navigation solo
- Rouge brique (#C45B3E) — aventure (multi-navs assemblees)
- Jaune (#F6BC00) — regate

### Simplification du modele
- L'Aventure n'est plus un niveau hierarchique : c'est un type de Navigation (AVENTURE)
- Dossiers imbriquables (max 2 niveaux)
- Migration Prisma en 2 etapes (ajout champs, puis suppression modele Aventure)

### Navigation globale
- Suppression du header — remplace par squiggle (top-left, retour accueil) + bouton user rond (top-right, menu popover)
- Menu user : Mes traces, Mes bateaux, Admin, Deconnexion
- Squiggle unifie sur toutes les vues (accueil, trace, navigation)

### Nettoyage
- Suppression des anciens composants journal (PageJournal, CarteDossier, CarteAventure, etc.)
- Suppression header, footer, CSS orphelin

## v0.5.1 — Icone app, TWA, polish UI (2026-03-24)

### Icone app
- Favicon SVG degrade bleu-rouge-jaune (line-squiggle de Lucide)
- Icone dans le header principal avec contour blanc sur fond bleu
- Icone squiggle decorative sur les panneaux stats (trace et navigation)

### TWA (True Wind Angle)
- Calcul TWA a partir du cap GPS et du vent Open-Meteo (`src/lib/geo/twa.ts`)
- Interpolation circulaire pour cap et direction vent (correction du bug lineaire)
- Pill TWA dans PanneauPointActif : icone composee bateau+vent avec decoupe mask
- Graphique TWA : domaine [-180, +180], zero au centre, courbe coloree par vitesse
- Tooltip unifie : toujours vitesse + cap + TWA, donnee chartee en bold (+200 font-weight)
- Tooltip vent (HUD compact) : force + direction seulement, sans heure

### Icone TWA
- Composant `IconeTWA` reutilisable : bateau ChartedSails decoupe par le vent Lucide via SVG mask
- Rotation +45° pour un rendu equilibre
- Utilisee dans la pill et le tooltip

### Panneau controle carte
- Boussole, couches et zoom fusionnes en une seule pill verticale
- Hover et etat actif clippes par border-radius individuel
- Bouton retour Journal repositionne a droite du panneau stats

### Pills et labels
- Data-labels (POS, DATE, VIT, CAP, TWA) sur chaque pill, style jaune accent
- Largeurs fixes (min-width) pour eviter les sauts au slide
- Valeurs paddees avec figure-space + tabular-nums
- Font-weight +200 sur la pill active
- Labels de graphiques (Vitesse, TWA, Vent) en style pill jaune

### Echelle carte
- Correction du calcul : arrondi vers le bas (la barre changeait pas de taille)

### Tooltip graphique
- Position fluide : translateX interpole lineairement de 0% a -100% selon la position

### Layout tablette (< 1080px)
- Panneau stats : polices reduites, breadcrumb tronque ("... > Aventure")
- Echelle masquee
- Onglets (vent, rose des vents) colles au graphique sans border-radius bas
- "Sup. meteo" au lieu de "Supprimer meteo", resolution masquee

### Corrections
- Date navigation : affiche la date du premier point GPS (pas la date de creation)
- Coordonnees : correction arrondi milliemes (1000 → propagation retenue)
- "kt" remplace "kn" partout pour l'abreviation des noeuds
- Ligne vent en blanc (meilleur contraste sur fond sombre du HUD)
- Intercaractere date reduit (-0.3px desktop, -0.5px tablette)
- Icone bateau inclinee 30° a cote du nom du bateau

## v0.5.0 — Enrichissement vent Open-Meteo (2026-03-23)

### Donnees vent
- Integration Open-Meteo Archive API (modele AROME France, 2.5km/1h)
- Cellules meteo stockees en base (Prisma), liees a la trace
- Stats vent calculees : moyenne, rafales max, direction moyenne circulaire, variation
- Filtrage temporel des cellules sur la plage de navigation

### HUD vent
- Rose des vents compacte (repliee) : icone vent orientee, force en kt
- HUD deploye : graphique Recharts compact (vent ou direction), basculable
- Selecteur mode vent/direction dans le HUD deploye
- Zoom et echelle remontent quand le HUD est deploye

### Controles carte
- Orientation carte : mode Nord (defaut) et mode Vent (oriente face au vent archive)
- Selecteur fond de carte : OSM, Satellite, SeaMap
- Indicateur vent semi-transparent sur la carte

### Tooltips synchronises
- Tooltips compacts sur graphique principal et HUD vent, avec double donnee
- Icones Lucide dans les tooltips (remplacement des emojis)
- Synchronisation curseur entre les deux graphiques

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
