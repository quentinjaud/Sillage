import { useCallback, useMemo, useState } from "react";
import type { PointCarte } from "@/lib/types";

interface RetourZoomTemporel {
  /** Timestamp debut de la plage (ms) — null si pas de zoom */
  debutZoom: number | null;
  /** Timestamp fin de la plage (ms) — null si pas de zoom */
  finZoom: number | null;
  /** true si un zoom temporel est actif */
  isZoomed: boolean;
  /** Points filtres par la plage temporelle (ou tous si pas de zoom) */
  pointsFiltres: PointCarte[];
  /** Definir la plage de zoom */
  setPlage: (debut: number, fin: number) => void;
  /** Reinitialiser le zoom (afficher toute la trace) */
  resetZoom: () => void;
  /** Duree de la plage en secondes */
  dureeZoom: number | null;
}

export function useZoomTemporel(points: PointCarte[]): RetourZoomTemporel {
  const [debutZoom, setDebutZoom] = useState<number | null>(null);
  const [finZoom, setFinZoom] = useState<number | null>(null);

  const isZoomed = debutZoom != null && finZoom != null;

  const pointsFiltres = useMemo(() => {
    if (!isZoomed) return points;
    return points.filter((p) => {
      if (!p.timestamp) return false;
      const t = new Date(p.timestamp).getTime();
      return t >= debutZoom && t <= finZoom;
    });
  }, [points, debutZoom, finZoom, isZoomed]);

  const setPlage = useCallback((debut: number, fin: number) => {
    // Toujours s'assurer que debut < fin
    const [d, f] = debut <= fin ? [debut, fin] : [fin, debut];
    setDebutZoom(d);
    setFinZoom(f);
  }, []);

  const resetZoom = useCallback(() => {
    setDebutZoom(null);
    setFinZoom(null);
  }, []);

  const dureeZoom = isZoomed ? (finZoom - debutZoom) / 1000 : null;

  return {
    debutZoom,
    finZoom,
    isZoomed,
    pointsFiltres,
    setPlage,
    resetZoom,
    dureeZoom,
  };
}
