/**
 * Détecte automatiquement la source d'un fichier GPX/KML
 * en analysant les métadonnées XML (creator, namespace, extensions).
 */
export function detectSource(xmlContent: string): string {
  // GPX: attribut creator="..." sur la balise racine
  const creatorMatch = xmlContent.match(/creator\s*=\s*"([^"]+)"/i);
  const creator = creatorMatch?.[1]?.toLowerCase() ?? "";

  // Navionics Boating
  if (creator.includes("navionics") || /navionics/i.test(xmlContent.slice(0, 2000))) {
    return "navionics";
  }

  // SailGrib WR
  if (
    creator.includes("sailgrib") ||
    /sailgrib/i.test(xmlContent.slice(0, 2000))
  ) {
    return "sailgrib";
  }

  // Weather4D / App4Nav
  if (
    creator.includes("weather4d") ||
    creator.includes("app4nav") ||
    /weather4d|app4nav/i.test(xmlContent.slice(0, 2000))
  ) {
    return "weather4d";
  }

  // Navimetrix
  if (
    creator.includes("navimetrix") ||
    /navimetrix|gserv\.navimetrix/i.test(xmlContent.slice(0, 2000))
  ) {
    return "navimetrix";
  }

  // OpenCPN
  if (creator.includes("opencpn")) {
    return "opencpn";
  }

  // Garmin
  if (creator.includes("garmin") || /xmlns[^"]*garmin/i.test(xmlContent.slice(0, 2000))) {
    return "garmin";
  }

  // Google Earth (KML)
  if (/google earth|xmlns[^"]*google/i.test(xmlContent.slice(0, 2000))) {
    return "google-earth";
  }

  // Strava
  if (creator.includes("strava")) {
    return "strava";
  }

  return "unknown";
}
