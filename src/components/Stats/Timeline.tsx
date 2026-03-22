"use client";

import { useCallback, useRef, useMemo } from "react";
import { format } from "date-fns";
import type { PointCarte } from "@/lib/types";

interface PropsTimeline {
  points: PointCarte[];
  pointActifIndex: number | null;
  onChangeIndex: (index: number) => void;
}

/** Trouve l'index du point avec le timestamp le plus proche */
function trouverPointProche(
  points: { timestamp: number; pointIndex: number }[],
  cible: number
): number {
  let debut = 0;
  let fin = points.length - 1;
  while (debut < fin) {
    const milieu = Math.floor((debut + fin) / 2);
    if (points[milieu].timestamp < cible) {
      debut = milieu + 1;
    } else {
      fin = milieu;
    }
  }
  if (debut > 0) {
    const diffAvant = Math.abs(points[debut - 1].timestamp - cible);
    const diffApres = Math.abs(points[debut].timestamp - cible);
    if (diffAvant < diffApres) return debut - 1;
  }
  return debut;
}

export default function Timeline({
  points,
  pointActifIndex,
  onChangeIndex,
}: PropsTimeline) {
  const barreRef = useRef<HTMLDivElement>(null);

  const pointsTemporels = useMemo(
    () =>
      points
        .filter((p) => p.timestamp != null)
        .map((p) => ({
          timestamp: new Date(p.timestamp!).getTime(),
          pointIndex: p.pointIndex,
        })),
    [points]
  );

  const { tempsDebut, duree } = useMemo(() => {
    const debut = pointsTemporels[0]?.timestamp ?? 0;
    const fin = pointsTemporels[pointsTemporels.length - 1]?.timestamp ?? 0;
    return { tempsDebut: debut, duree: fin - debut || 1 };
  }, [pointsTemporels]);

  const { positionCurseur, heurePointActif } = useMemo(() => {
    if (pointActifIndex == null || pointsTemporels.length === 0)
      return { positionCurseur: null, heurePointActif: null };
    const pt = pointsTemporels.find((p) => p.pointIndex === pointActifIndex);
    if (!pt) return { positionCurseur: null, heurePointActif: null };
    return {
      positionCurseur: ((pt.timestamp - tempsDebut) / duree) * 100,
      heurePointActif: format(new Date(pt.timestamp), "HH:mm:ss"),
    };
  }, [pointActifIndex, pointsTemporels, tempsDebut, duree]);

  const calculerIndexDepuisPosition = useCallback(
    (clientX: number) => {
      const barre = barreRef.current;
      if (!barre || pointsTemporels.length === 0) return;
      const rect = barre.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const tempsCible = tempsDebut + ratio * duree;
      const idx = trouverPointProche(pointsTemporels, tempsCible);
      onChangeIndex(pointsTemporels[idx].pointIndex);
    },
    [pointsTemporels, tempsDebut, duree, onChangeIndex]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      calculerIndexDepuisPosition(e.clientX);

      const handleMove = (ev: MouseEvent) => {
        calculerIndexDepuisPosition(ev.clientX);
      };
      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [calculerIndexDepuisPosition]
  );

  if (pointsTemporels.length < 2) return null;

  return (
    <div className="timeline">
      <div
        className="timeline-barre"
        ref={barreRef}
        onMouseDown={handleMouseDown}
      >
        <div className="timeline-fond" />
        {positionCurseur != null && (
          <div
            className="timeline-curseur"
            style={{ left: `${positionCurseur}%` }}
          />
        )}
      </div>
      {heurePointActif && (
        <span className="timeline-heure">{heurePointActif}</span>
      )}
    </div>
  );
}
