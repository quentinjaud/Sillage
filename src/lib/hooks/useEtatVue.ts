import { useCallback, useMemo, useState } from "react";
import type { PointCarte, DonneeGraphee } from "@/lib/types";

export const HAUTEUR_GRAPHIQUE_INITIALE = 200;
export const MARGE_GRAPHIQUE = 56;

/** Hook partage entre TraceVueClient et NavigationVueClient */
export function useEtatVue(points: PointCarte[]) {
  const [paddingBas, setPaddingBas] = useState(
    HAUTEUR_GRAPHIQUE_INITIALE + MARGE_GRAPHIQUE
  );
  const [pointActifIndex, setPointActifIndex] = useState<number | null>(null);
  const [donneeGraphee, setDonneeGraphee] = useState<DonneeGraphee>("vitesse");

  const capDisponible = useMemo(
    () => points.some((p) => p.headingDeg != null),
    [points]
  );

  const pointActif = useMemo(() => {
    if (pointActifIndex == null) return null;
    return points.find((p) => p.pointIndex === pointActifIndex) ?? null;
  }, [points, pointActifIndex]);

  const handleHauteurChange = useCallback((hauteur: number) => {
    setPaddingBas(hauteur + MARGE_GRAPHIQUE);
  }, []);

  return {
    paddingBas,
    pointActifIndex,
    setPointActifIndex,
    donneeGraphee,
    setDonneeGraphee,
    capDisponible,
    pointActif,
    handleHauteurChange,
  };
}
