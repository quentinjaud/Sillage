import { prisma } from "@/lib/db";
import { analyserFichierTrace } from "@/lib/parsers";
import { calculerStats } from "@/lib/geo/stats";
import { detecterAberrants } from "@/lib/geo/detection-aberrants";
import { simplifierRDP } from "@/lib/geo/simplification";

/** Taille maximale autorisée pour un fichier (50 Mo) */
const TAILLE_MAX_OCTETS = 50 * 1024 * 1024;

/** Extensions acceptées */
const EXTENSIONS_VALIDES = ["gpx", "kml"];

/**
 * Importe une trace depuis un fichier uploadé :
 * validation → parsing → calcul stats → insertion en base.
 */
export async function importerTrace(fichier: File, userId: string) {
  // Validation de la taille
  if (fichier.size > TAILLE_MAX_OCTETS) {
    throw new Error("Fichier trop volumineux (max 50 Mo)");
  }

  // Validation de l'extension
  const extension = fichier.name.toLowerCase().split(".").pop();
  if (!extension || !EXTENSIONS_VALIDES.includes(extension)) {
    throw new Error(`Format non supporté : .${extension}. Utilisez .gpx ou .kml`);
  }

  // Parsing du fichier
  const contenu = await fichier.text();
  const { trace: analysee, source, format } = analyserFichierTrace(
    fichier.name,
    contenu
  );

  if (analysee.points.length === 0) {
    throw new Error("Aucun point trouvé dans le fichier");
  }

  // Détection des points aberrants
  const { indexAberrants } = detecterAberrants(analysee.points);

  // Calcul des statistiques sur les points non-aberrants uniquement
  const pointsPropres = analysee.points.filter((_, i) => !indexAberrants.has(i));
  const statistiques = calculerStats(
    pointsPropres.length >= 2 ? pointsPropres : analysee.points
  );
  const debutNav = analysee.points.find((p) => p.timestamp)?.timestamp ?? null;

  // Polyline simplifiee pour les mini-cartes d'apercu (50-100 points)
  const pointsNonExclus = analysee.points.filter((_, i) => !indexAberrants.has(i));
  const pointsSimplifies = simplifierRDP(pointsNonExclus, 0.005); // ~9m tolerance en NM
  const polylineSimplifiee = pointsSimplifies.map((p) => [p.lon, p.lat]);

  // Insertion en base
  const trace = await prisma.trace.create({
    data: {
      name: analysee.name,
      filename: fichier.name,
      format,
      source,
      userId,
      startedAt: debutNav,
      distanceNm: statistiques.distanceNm,
      durationSeconds: statistiques.durationSeconds,
      avgSpeedKn: statistiques.avgSpeedKn,
      maxSpeedKn: statistiques.maxSpeedKn,
      polylineSimplifiee,
      points: {
        create: analysee.points.map((p, i) => ({
          lat: p.lat,
          lon: p.lon,
          timestamp: p.timestamp,
          speedKn: p.speedKn,
          headingDeg: p.headingDeg,
          elevationM: p.elevationM,
          pointIndex: i,
          isExcluded: indexAberrants.has(i),
        })),
      },
    },
  });

  return trace;
}
