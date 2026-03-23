import { prisma } from "@/lib/db";
import { calculerStatsVent, filtrerCellulesParPlage } from "../geo/stats-vent";
import type { StatsVent, CelluleMeteoClient } from "../types";

const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GRILLE_DEG = 0.25;
const DELAI_ARCHIVE_MS = 7 * 24 * 60 * 60 * 1000;

function arrondir(coord: number): number {
  return Math.round(coord / GRILLE_DEG) * GRILLE_DEG;
}

function determinerCentresCellules(
  latMin: number, latMax: number, lonMin: number, lonMax: number
): { lat: number; lon: number }[] {
  const centres: { lat: number; lon: number }[] = [];
  const latDebut = arrondir(latMin);
  const latFin = arrondir(latMax);
  const lonDebut = arrondir(lonMin);
  const lonFin = arrondir(lonMax);

  for (let lat = latDebut; lat <= latFin + GRILLE_DEG / 2; lat += GRILLE_DEG) {
    for (let lon = lonDebut; lon <= lonFin + GRILLE_DEG / 2; lon += GRILLE_DEG) {
      centres.push({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
    }
  }
  return centres;
}

export async function chargerVentOpenMeteo(traceId: string): Promise<{
  statsVent: StatsVent;
  cellules: CelluleMeteoClient[];
}> {
  const existant = await prisma.celluleMeteo.count({ where: { traceId } });
  if (existant > 0) {
    throw new Error("Donnees meteo deja presentes pour cette trace");
  }

  const points = await prisma.trackPoint.findMany({
    where: { traceId, isExcluded: false, timestamp: { not: null } },
    select: { lat: true, lon: true, timestamp: true },
    orderBy: { pointIndex: "asc" },
  });

  if (points.length === 0) {
    throw new Error("Aucun point avec timestamp dans cette trace");
  }

  const dernierTimestamp = points[points.length - 1].timestamp!;
  if (Date.now() - dernierTimestamp.getTime() < DELAI_ARCHIVE_MS) {
    throw new Error("Trace trop recente — donnees archives disponibles apres 7 jours");
  }

  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const p of points) {
    if (p.lat < latMin) latMin = p.lat;
    if (p.lat > latMax) latMax = p.lat;
    if (p.lon < lonMin) lonMin = p.lon;
    if (p.lon > lonMax) lonMax = p.lon;
  }

  const premierTimestamp = points[0].timestamp!;
  const dateDebut = premierTimestamp.toISOString().split("T")[0];
  const dateFin = dernierTimestamp.toISOString().split("T")[0];

  const centres = determinerCentresCellules(latMin, latMax, lonMin, lonMax);

  const toutesLignes: {
    latitude: number;
    longitude: number;
    dateDebut: Date;
    dateFin: Date;
    ventVitesseKn: number;
    ventRafalesKn: number;
    ventDirectionDeg: number;
  }[] = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < centres.length; i += BATCH_SIZE) {
    const batch = centres.slice(i, i + BATCH_SIZE);
    const lats = batch.map((c) => c.lat).join(",");
    const lons = batch.map((c) => c.lon).join(",");

    const url = `${OPEN_METEO_ARCHIVE_URL}?latitude=${lats}&longitude=${lons}&start_date=${dateDebut}&end_date=${dateFin}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=UTC`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit Open-Meteo atteint — reessayez plus tard");
      }
      throw new Error(`Erreur Open-Meteo : ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultats = Array.isArray(data) ? data : [data];

    for (let j = 0; j < resultats.length; j++) {
      const resultat = resultats[j];
      const centre = batch[j];
      const heures = resultat.hourly?.time ?? [];
      const vitesses = resultat.hourly?.wind_speed_10m ?? [];
      const directions = resultat.hourly?.wind_direction_10m ?? [];
      const rafales = resultat.hourly?.wind_gusts_10m ?? [];

      for (let k = 0; k < heures.length; k++) {
        if (vitesses[k] == null || directions[k] == null) continue;
        const heure = new Date(heures[k]);
        toutesLignes.push({
          latitude: centre.lat,
          longitude: centre.lon,
          dateDebut: heure,
          dateFin: new Date(heure.getTime() + 3600_000),
          ventVitesseKn: vitesses[k],
          ventRafalesKn: rafales[k] ?? vitesses[k],
          ventDirectionDeg: directions[k],
        });
      }
    }
  }

  await prisma.celluleMeteo.createMany({
    data: toutesLignes.map((l) => ({ traceId, ...l })),
    skipDuplicates: true,
  });

  const cellulesClient: CelluleMeteoClient[] = toutesLignes.map((l) => ({
    latitude: l.latitude,
    longitude: l.longitude,
    dateDebut: l.dateDebut.toISOString(),
    dateFin: l.dateFin.toISOString(),
    ventVitesseKn: l.ventVitesseKn,
    ventRafalesKn: l.ventRafalesKn,
    ventDirectionDeg: l.ventDirectionDeg,
  }));

  // Stats calculees uniquement sur la plage de navigation
  const cellulesNav = filtrerCellulesParPlage(
    cellulesClient,
    premierTimestamp.toISOString(),
    dernierTimestamp.toISOString()
  );
  const statsVent: StatsVent = {
    ...calculerStatsVent(cellulesNav),
    source: "open-meteo-archive",
    resolution: "25km/1h",
  };

  return { statsVent, cellules: cellulesClient };
}

export async function supprimerVentOpenMeteo(traceId: string): Promise<void> {
  await prisma.celluleMeteo.deleteMany({ where: { traceId } });
}
