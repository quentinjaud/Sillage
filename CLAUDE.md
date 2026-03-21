@AGENTS.md

# Navimeter

App d'analyse de traces de navigation à voile.

## Stack

- Next.js 15 + React 19 + TypeScript + Tailwind v4
- Prisma 6 + PostgreSQL (Railway)
- Leaflet + OpenStreetMap + OpenSeaMap (tuiles nautiques)
- Recharts (graphiques vitesse/temps)

## Architecture

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx            # Accueil : upload + liste des traces
│   ├── trace/[id]/page.tsx # Vue détaillée d'une trace (carte + stats)
│   └── api/traces/         # API REST (POST upload, GET list, GET/DELETE by id)
├── components/
│   ├── Map/                # TraceMap (Leaflet) + TraceMapWrapper (ssr:false)
│   ├── Stats/              # StatsPanel + SpeedChart
│   ├── Upload/             # FileUpload (drag & drop)
│   └── TraceList/          # Liste des traces importées
└── lib/
    ├── parsers/            # GPX et KML → ParsedTrace
    ├── geo/                # Calculs : distance, heading, speed, stats
    ├── types.ts            # Types partagés
    └── db.ts               # Singleton Prisma
```

## Conventions

- **Langue** : UI en français, code en anglais
- **Unités nautiques** : nœuds (kn), milles nautiques (NM), degrés (°)
- **Charte graphique** : jaune #F6BC00, bleu #43728B, gris chauds, fond crème #FAF8F5
- **Police** : Atkinson Hyperlegible Next
- **Carte** : Leaflet côté client uniquement (ssr: false via TraceMapWrapper)

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
- Leaflet ne supporte pas le SSR → toujours wrapper avec `dynamic()` + `ssr: false`
- Les coordonnées sont stockées en WGS84 (lat/lon décimaux)
- Les points sont ordonnés par `pointIndex` (pas par timestamp, qui peut être null)

## Roadmap

Voir [ROADMAP.md](ROADMAP.md) pour le backlog complet et les features à venir.
