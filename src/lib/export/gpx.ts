interface PointExport {
  lat: number;
  lon: number;
  timestamp: Date | null;
  elevationM: number | null;
  speedKn: number | null;
}

/**
 * Génère un fichier GPX 1.1 valide à partir d'un nom de trace et d'une liste de points.
 */
export function genererGpx(nom: string, points: PointExport[]): string {
  const lignes: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Sillage"',
    '  xmlns="http://www.topografix.com/GPX/1/1">',
    "  <trk>",
    `    <name>${echapperXml(nom)}</name>`,
    "    <trkseg>",
  ];

  for (const p of points) {
    lignes.push(`      <trkpt lat="${p.lat}" lon="${p.lon}">`);
    if (p.elevationM !== null) {
      lignes.push(`        <ele>${p.elevationM}</ele>`);
    }
    if (p.timestamp) {
      lignes.push(`        <time>${p.timestamp.toISOString()}</time>`);
    }
    lignes.push("      </trkpt>");
  }

  lignes.push("    </trkseg>");
  lignes.push("  </trk>");
  lignes.push("</gpx>");

  return lignes.join("\n");
}

function echapperXml(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
