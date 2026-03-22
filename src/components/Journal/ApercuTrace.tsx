"use client";

import { useMemo } from "react";
import {
  calculerBbox, calculerZoomOptimal, lonEnPixel, latEnPixel,
  tuilesNecessaires, urlTuileOSM,
} from "@/lib/geo/projection";
import { COULEURS } from "@/lib/theme";

interface PropsApercuTrace {
  polylines: [number, number][][];
  largeur?: number;
  hauteur?: number;
}

const TAILLE_TUILE = 256;

export default function ApercuTrace({
  polylines, largeur = 200, hauteur = 140,
}: PropsApercuTrace) {
  const donnees = useMemo(() => {
    const tousLesPoints = polylines.flat();
    if (tousLesPoints.length < 2) return null;

    const bbox = calculerBbox(tousLesPoints);
    const zoom = calculerZoomOptimal(bbox, largeur, hauteur);
    const tuiles = tuilesNecessaires(bbox, zoom);

    const centreX = (lonEnPixel(bbox.minLon, zoom) + lonEnPixel(bbox.maxLon, zoom)) / 2;
    const centreY = (latEnPixel(bbox.maxLat, zoom) + latEnPixel(bbox.minLat, zoom)) / 2;
    const offsetX = largeur / 2 - centreX;
    const offsetY = hauteur / 2 - centreY;

    const tuilesPositionnees = tuiles.map((t) => ({
      url: urlTuileOSM(t.x, t.y, t.z),
      left: t.x * TAILLE_TUILE + offsetX,
      top: t.y * TAILLE_TUILE + offsetY,
    }));

    const polylinesPixels = polylines.map((poly) =>
      poly.map(([lon, lat]) => ({
        x: lonEnPixel(lon, zoom) + offsetX,
        y: latEnPixel(lat, zoom) + offsetY,
      }))
    );

    return { tuilesPositionnees, polylinesPixels };
  }, [polylines, largeur, hauteur]);

  if (!donnees) {
    return (
      <div className="apercu-trace apercu-trace-vide" style={{ width: largeur, height: hauteur }}>
        Aucune trace
      </div>
    );
  }

  return (
    <div className="apercu-trace" style={{ width: largeur, height: hauteur }}>
      {donnees.tuilesPositionnees.map((tuile, i) => (
        <img key={i} src={tuile.url} alt="" className="apercu-trace-tuile"
          style={{ left: tuile.left, top: tuile.top }} loading="lazy" />
      ))}
      <svg className="apercu-trace-svg" width={largeur} height={hauteur}
        viewBox={`0 0 ${largeur} ${hauteur}`}>
        {donnees.polylinesPixels.map((points, i) => (
          <polyline key={i}
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke={COULEURS.accent} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
}
