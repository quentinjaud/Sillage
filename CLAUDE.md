@AGENTS.md

# Sillage

App d'analyse de traces de navigation a voile — journal de bord + analyse de performance.

## Stack

- Next.js 16 + React 19 + TypeScript + Mantine + CSS vanilla
- Prisma 7 + PostgreSQL (Railway)
- Better Auth (email/password, sessions 7j)
- MapLibre GL JS + react-map-gl (carte, SSR interdit)
- Recharts (graphiques vitesse/temps)

## Conventions

- **Langue** : tout en francais (UI, code, commits). Nommage sans accents (`formaterDuree`, `PointAnalyse`)
- **Unites** : noeuds (kn), milles nautiques (NM), degres
- **Charte** : jaune #F6BC00, bleu #43728B, fond creme #FFFDF9 — voir `src/lib/theme.ts`
- **Police** : Atkinson Hyperlegible Next
- **Desktop-first** : le responsive est secondaire
- **Tactile** : usage mixte desktop/tablette. Tout hover doit avoir un equivalent tactile. Taille minimale 44px pour les cibles cliquables/draggables (zone de touch, pas forcement l'element visible)

## Commandes

```bash
npm run dev          # Dev local (port 3000)
npm run build        # Build production (inclut prisma generate)
npm run db:migrate   # Prisma migrate dev
npm run db:studio    # Prisma Studio (port 5555)
```

## Deploiement

- Railway : auto-deploy sur push `main` — **chaque push declenche un build payant**
- **Ne pas push directement sur `main`** : branche → merger quand c'est pret
- Start : `prisma migrate deploy && next start`

## Pieges connus

- `force-dynamic` obligatoire sur les pages avec requetes DB
- MapLibre : toujours `dynamic()` + `ssr: false`
- Points ordonnes par `pointIndex` (pas par timestamp)
- **Soft-delete GPS** : `isExcluded` sur TrackPoint, jamais supprimer les donnees originales
- **Turbopack cache** : `rm -rf .next` si un changement JSX n'est pas pris en compte
- **Routing Next.js** : un seul nom de slug par niveau de route dynamique (`[id]` partout, pas `[dossierId]` a cote de `[id]`)
- **Recharts axe X** : `dataKey` string = axe categoriel (espacement uniforme par index). Pour un axe proportionnel au temps, utiliser `type="number"` + `scale="time"` + timestamps numeriques
- **MutationObserver + setState** : boucle infinie garantie. Utiliser ResizeObserver ou mesure ponctuelle (setTimeout)
- **Curseur synchronise** : pattern pointFixe/pointSurvole dans `useEtatVue` — le point affiche = survole ?? fixe
- **Cibles tactiles** : les slider thumbs, resize handles et boutons d'action doivent avoir une zone de touch >= 44px meme si l'element visible est plus petit (utiliser padding, pseudo-elements, ou hit area invisible)
- **Hover sur tablette** : les elements reveles au hover (actions cartes journal, tooltips) doivent etre accessibles autrement (toujours visibles, tap, ou menu contextuel)

## Modele de donnees

```
User → Bateau[], Trace[], Dossier[], Aventure[], Navigation[]

Dossier (border jaune) → Aventure[] + Navigation[] orphelines
Aventure (border bleu) → Navigation[]
Navigation → Trace? (1:1, @unique traceId)

Trace → TrackPoint[] + polylineSimplifiee (Json, RDP 50-100 pts pour mini-cartes)
TrackPoint → lat, lon, timestamp?, speedKn?, isExcluded (soft-delete)
```

- Cascade delete : Dossier → Aventure → Navigation. Trace jamais supprimee par cascade.
- Mini-cartes : tuiles OSM raster + CSS `grayscale(1)` + SVG overlay — pas d'instance MapLibre

## Roadmap

Voir [ROADMAP.md](ROADMAP.md) et [CHANGELOG.md](CHANGELOG.md).
