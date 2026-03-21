@AGENTS.md

# Navimeter

App d'analyse de traces de navigation à voile.

## Stack

- Next.js 16 + React 19 + TypeScript + Mantine + CSS vanilla
- Prisma 7 + PostgreSQL (Railway)
- MapLibre GL JS + react-map-gl + OpenStreetMap + OpenSeaMap (tuiles nautiques, rendu WebGL)
- Recharts (graphiques vitesse/temps)

## Architecture

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx            # Accueil : upload + liste des traces
│   ├── trace/[id]/page.tsx # Vue détaillée d'une trace (carte + stats)
│   └── api/traces/         # API REST (POST upload, GET list, GET/DELETE by id)
├── components/
│   ├── Map/                # TraceMap (MapLibre GL JS) + TraceMapWrapper (ssr:false)
│   ├── Stats/              # StatsPanel + SpeedChart
│   ├── Upload/             # FileUpload (drag & drop, validation taille)
│   └── TraceList/          # Liste des traces importées
└── lib/
    ├── parsers/            # GPX et KML → TraceAnalysee
    │   └── commun.ts       # Logique partagée (enrichirPoints, extrairePointsGeoJson)
    ├── geo/                # Calculs : distance, cap, vitesse, stats, simplification, lissage
    │   └── math.ts         # Fonctions mathématiques partagées (enRadians, enDegres)
    ├── services/           # Logique métier (import-trace.ts)
    ├── types.ts            # Types partagés (PointAnalyse, TraceAnalysee, etc.)
    ├── theme.ts            # Constantes de couleurs (COULEURS)
    ├── utilitaires.ts      # Fonctions utilitaires (formaterDuree)
    ├── journal.ts          # Logger minimal (journalErreur, journalAvertissement)
    └── db.ts               # Singleton Prisma
```

## Conventions

- **Langue** : tout en français (UI, code, commits, logs GitHub)
- **Nommage code** : français sans accents (ex: `formaterDuree`, `detecterSource`, `PointAnalyse`)
- **Unités nautiques** : nœuds (kn), milles nautiques (NM), degrés (°)
- **Charte graphique** : jaune #F6BC00, bleu #43728B, gris chauds, fond crème #FFFDF9 — constantes centralisées dans `src/lib/theme.ts`
- **Police** : Atkinson Hyperlegible Next
- **Carte** : MapLibre GL JS côté client uniquement (ssr: false via TraceMapWrapper)
- **Desktop-first** : l'analyse de traces se fait sur desktop, le responsive est secondaire

## Commandes

```bash
npm run dev          # Dev local (port 3000)
npm run build        # Build production (inclut prisma generate)
npm run db:migrate   # Prisma migrate dev
npm run db:studio    # Prisma Studio (port 5555)
```

## Déploiement

- Railway : auto-deploy sur push `main` via GitHub
- La variable `DATABASE_URL` utilise l'URL **interne** Railway en prod
- Start command : `prisma migrate deploy && next start`
- Build : `prisma generate && next build`

## Points d'attention

- `force-dynamic` obligatoire sur les pages qui font des requêtes DB (sinon erreur au build)
- MapLibre GL JS ne supporte pas le SSR → toujours wrapper avec `dynamic()` + `ssr: false`
- Les coordonnées sont stockées en WGS84 (lat/lon décimaux)
- Les points sont ordonnés par `pointIndex` (pas par timestamp, qui peut être null)
- Validation taille fichier : 50 Mo max (client + serveur)

## Roadmap

Voir [ROADMAP.md](ROADMAP.md) pour le backlog complet et les features à venir.
