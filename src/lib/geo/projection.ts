/**
 * Projection Web Mercator (EPSG:3857)
 * Convertit des coordonnees [lon, lat] en pixels pour un niveau de zoom donne.
 */

const TAILLE_TUILE = 256;

/** Convertit longitude en pixel X au zoom donne. */
export function lonEnPixel(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TAILLE_TUILE;
}

/** Convertit latitude en pixel Y au zoom donne. */
export function latEnPixel(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom) *
    TAILLE_TUILE
  );
}

/** Calcule le bounding box d'un tableau de [lon, lat]. */
export function calculerBbox(points: [number, number][]): {
  minLon: number; maxLon: number; minLat: number; maxLat: number;
} {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat };
}

/** Calcule le zoom optimal pour afficher un bbox dans une taille donnee (en pixels). */
export function calculerZoomOptimal(
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  largeur: number, hauteur: number
): number {
  for (let zoom = 18; zoom >= 1; zoom--) {
    const x1 = lonEnPixel(bbox.minLon, zoom);
    const x2 = lonEnPixel(bbox.maxLon, zoom);
    const y1 = latEnPixel(bbox.maxLat, zoom);
    const y2 = latEnPixel(bbox.minLat, zoom);
    if (x2 - x1 <= largeur * 0.85 && y2 - y1 <= hauteur * 0.85) return zoom;
  }
  return 1;
}

/** Retourne l'URL de la tuile OSM pour des coordonnees de tuile. */
export function urlTuileOSM(x: number, y: number, z: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/** Calcule les tuiles necessaires pour couvrir un bbox a un zoom donne. */
export function tuilesNecessaires(
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  zoom: number
): { x: number; y: number; z: number }[] {
  const xMin = Math.floor(lonEnPixel(bbox.minLon, zoom) / TAILLE_TUILE);
  const xMax = Math.floor(lonEnPixel(bbox.maxLon, zoom) / TAILLE_TUILE);
  const yMin = Math.floor(latEnPixel(bbox.maxLat, zoom) / TAILLE_TUILE);
  const yMax = Math.floor(latEnPixel(bbox.minLat, zoom) / TAILLE_TUILE);
  const tuiles: { x: number; y: number; z: number }[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tuiles.push({ x, y, z: zoom });
    }
  }
  return tuiles;
}
