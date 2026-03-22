# Sillage

Analyse de traces de navigation à voile.

Importez vos traces GPX/KML depuis Navionics, SailGrib WR, Weather4D ou Navimetrix pour visualiser et analyser vos navigations.

## Stack

- Next.js 15 + React 19 + TypeScript
- Prisma + PostgreSQL (Railway)
- Leaflet + OpenStreetMap + OpenSeaMap
- Tailwind CSS v4, Recharts

## Développement

```bash
# Installer les dépendances
npm install

# Configurer la base de données (créer .env avec DATABASE_URL)
npm run db:migrate

# Lancer le serveur de dev
npm run dev
```

## Déploiement

Hébergé sur Railway avec PostgreSQL.
