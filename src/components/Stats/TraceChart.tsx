"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { COULEURS } from "@/lib/theme";
import {
  calculerStatsVitesse,
  vitesseVersCouleur,
} from "@/lib/geo/couleur-vitesse";
import type { PointCarte, DonneeGraphee, CelluleMeteoClient } from "@/lib/types";
import { sousechantillonner } from "@/lib/utilitaires";

interface PropsTraceChart {
  points: PointCarte[];
  donnee: DonneeGraphee;
  pointActifIndex: number | null;
  pointFixeIndex: number | null;
  onHoverPoint: (pointIndex: number | null) => void;
  onClickPoint?: (pointIndex: number | null) => void;
  cellulesMeteo?: CelluleMeteoClient[];
}

const CONFIG_DONNEES: Record<
  Exclude<DonneeGraphee, "vent">,
  {
    titre: string;
    cle: keyof PointCarte;
    unite: string;
    formater: (v: number) => string;
    domaine?: [number, number];
  }
> = {
  vitesse: {
    titre: "Vitesse",
    cle: "speedKn",
    unite: "kn",
    formater: (v) => `${v.toFixed(1)} kn`,
  },
  cap: {
    titre: "Cap GPS",
    cle: "headingDeg",
    unite: "°",
    formater: (v) => `${Math.round(v)}°`,
    domaine: [0, 360],
  },
};

interface DonneeGraphique {
  temps: number;
  heure: string;
  valeur: number;
  pointIndex: number;
}

/** Marge par defaut de Recharts LineChart */
const MARGE_DROITE_PLOT = 5;

const CONFIG_VENT = {
  titre: "Vent",
  unite: "kn",
  formater: (v: number) => `${v.toFixed(1)} kn`,
};

export default function TraceChart({
  points,
  donnee,
  pointActifIndex,
  pointFixeIndex,
  onHoverPoint,
  onClickPoint,
  cellulesMeteo,
}: PropsTraceChart) {
  // Mode vent actif si donnee === "vent" ET des cellules sont disponibles
  const modeVent = donnee === "vent" && (cellulesMeteo?.length ?? 0) > 0;

  // Pour les modes vitesse/cap, repli sur vitesse si vent sans cellules
  const donneeEffective: Exclude<DonneeGraphee, "vent"> =
    donnee === "vent" ? "vitesse" : donnee;
  const config = CONFIG_DONNEES[donneeEffective];
  const conteneurRef = useRef<HTMLDivElement>(null);

  // Mesure la position reelle de l'axe X via le DOM Recharts
  const [sliderStyle, setSliderStyle] = useState<{
    left: number;
    right: number;
    bottom: number;
  } | null>(null);

  const donneesGraphique = useMemo(
    () =>
      sousechantillonner(
        points
          .filter(
            (p) =>
              p.timestamp != null && (p[config.cle] as number | null) != null
          )
          .map((p, i) => ({
            temps: new Date(p.timestamp!).getTime(),
            heure: p.timestamp!,
            valeur: p[config.cle] as number,
            pointIndex: p.pointIndex ?? i,
          })),
        500
      ),
    [points, donneeEffective]
  );

  // Dataset vent : un point par heure, centre de l'intervalle, moyenne si plusieurs cellules
  const donneesVent = useMemo((): DonneeGraphique[] => {
    if (!cellulesMeteo || cellulesMeteo.length === 0) return [];
    // Regrouper par timestamp central
    const parTimestamp = new Map<number, number[]>();
    for (const cellule of cellulesMeteo) {
      const debut = new Date(cellule.dateDebut).getTime();
      const fin = new Date(cellule.dateFin).getTime();
      const centre = Math.round((debut + fin) / 2);
      const existantes = parTimestamp.get(centre) ?? [];
      existantes.push(cellule.ventVitesseKn);
      parTimestamp.set(centre, existantes);
    }
    return Array.from(parTimestamp.entries())
      .map(([temps, vitesses], i) => ({
        temps,
        heure: new Date(temps).toISOString(),
        valeur: vitesses.reduce((a, b) => a + b, 0) / vitesses.length,
        pointIndex: i,
      }))
      .sort((a, b) => a.temps - b.temps);
  }, [cellulesMeteo]);

  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;
    const mesurer = () => {
      const axeLine = el.querySelector(".recharts-xAxis .recharts-cartesian-axis-line");
      if (!axeLine) return;
      const containerRect = el.getBoundingClientRect();
      const lineRect = axeLine.getBoundingClientRect();
      const nouveau = {
        left: lineRect.left - containerRect.left,
        right: containerRect.right - lineRect.right,
        bottom: containerRect.bottom - lineRect.top - 2,
      };
      setSliderStyle((prev) => {
        if (prev && prev.left === nouveau.left && prev.right === nouveau.right && prev.bottom === nouveau.bottom) return prev;
        return nouveau;
      });
    };
    // Attendre que Recharts ait rendu le SVG
    const timer = setTimeout(mesurer, 100);
    const resizeObs = new ResizeObserver(mesurer);
    resizeObs.observe(el);
    return () => {
      clearTimeout(timer);
      resizeObs.disconnect();
    };
  }, [donneesGraphique, donneesVent]);

  // Dataset actif selon le mode
  const donneesActives = modeVent ? donneesVent : donneesGraphique;

  // Plage temporelle
  const { tempsDebut, duree } = useMemo(() => {
    if (donneesActives.length === 0) return { tempsDebut: 0, duree: 1 };
    const debut = donneesActives[0].temps;
    const fin = donneesActives[donneesActives.length - 1].temps;
    return { tempsDebut: debut, duree: fin - debut || 1 };
  }, [donneesActives]);

  // Position du thumb fixe en % — par temps (coherent avec l'axe numerique)
  const positionThumbFixe = useMemo(() => {
    if (pointFixeIndex == null || donneesActives.length < 2) return null;
    const d = donneesActives.find((d) => d.pointIndex === pointFixeIndex);
    if (!d) return null;
    return ((d.temps - tempsDebut) / duree) * 100;
  }, [pointFixeIndex, donneesActives, tempsDebut, duree]);

  // Gradient toujours base sur la vitesse (lecture croisee)
  const donneesVitesse = useMemo(
    () =>
      sousechantillonner(
        points
          .filter((p) => p.timestamp != null && p.speedKn != null)
          .map((p, i) => ({
            temps: new Date(p.timestamp!).getTime(),
            vitesse: p.speedKn!,
            pointIndex: p.pointIndex ?? i,
          })),
        500
      ),
    [points]
  );

  const gradientStops = useMemo(() => {
    const stats = calculerStatsVitesse(
      donneesVitesse.map((d) => d.vitesse)
    );
    return donneesVitesse.map((d, i) => ({
      offset: `${(i / Math.max(donneesVitesse.length - 1, 1)) * 100}%`,
      color: vitesseVersCouleur(d.vitesse, stats),
    }));
  }, [donneesVitesse]);

  const tempsSurvole = useMemo(() => {
    if (pointActifIndex == null) return null;
    const d = donneesActives.find((d) => d.pointIndex === pointActifIndex);
    return d?.temps ?? null;
  }, [pointActifIndex, donneesActives]);

  // Ref pour capturer le dernier point survole (utilise par onClick)
  const dernierPointSurvoleRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      const state = args[0];
      let idx: number | undefined;
      if (state?.activePayload?.[0]?.payload?.pointIndex !== undefined) {
        idx = state.activePayload[0].payload.pointIndex;
      } else if (state?.activeLabel != null) {
        const point = donneesActives.find(
          (d) => d.temps === state.activeLabel
        );
        if (point) idx = point.pointIndex;
      }
      if (idx !== undefined) {
        dernierPointSurvoleRef.current = idx;
        onHoverPoint(idx);
      }
    },
    [onHoverPoint, donneesActives]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  const handleClick = useCallback(() => {
    if (!onClickPoint || dernierPointSurvoleRef.current == null) return;
    onClickPoint(dernierPointSurvoleRef.current);
  }, [onClickPoint]);

  // Trouve le point le plus proche d'un ratio (0-1) sur la plage temporelle
  const trouverPointParRatio = useCallback(
    (ratio: number) => {
      if (donneesActives.length === 0) return null;
      const tempsCible = tempsDebut + ratio * duree;
      let meilleur = donneesActives[0];
      let meilleureDiff = Infinity;
      for (const d of donneesActives) {
        const diff = Math.abs(d.temps - tempsCible);
        if (diff < meilleureDiff) {
          meilleureDiff = diff;
          meilleur = d;
        }
      }
      return meilleur.pointIndex;
    },
    [donneesActives, tempsDebut, duree]
  );

  // Drag du thumb slider — logique partagee mouse/touch
  const deplacerThumb = useCallback(
    (clientX: number) => {
      if (!onClickPoint) return;
      const conteneur = conteneurRef.current;
      if (!conteneur) return;
      const rect = conteneur.getBoundingClientRect();
      const s = sliderStyle ?? { left: 30, right: 5 };
      const zoneGauche = rect.left + s.left;
      const zoneDroite = rect.right - s.right;
      const largeurZone = zoneDroite - zoneGauche;
      const ratio = Math.max(0, Math.min(1, (clientX - zoneGauche) / largeurZone));
      const idx = trouverPointParRatio(ratio);
      if (idx != null) onClickPoint(idx);
    },
    [onClickPoint, trouverPointParRatio, sliderStyle]
  );

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onClickPoint) return;
      e.preventDefault();
      e.stopPropagation();

      const handleMove = (ev: MouseEvent) => deplacerThumb(ev.clientX);
      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [onClickPoint, deplacerThumb]
  );

  const handleThumbTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!onClickPoint) return;
      e.stopPropagation();

      const handleMove = (ev: TouchEvent) => {
        ev.preventDefault();
        deplacerThumb(ev.touches[0].clientX);
      };
      const handleEnd = () => {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [onClickPoint, deplacerThumb]
  );

  // Tap-to-hover sur tactile : un tap sur le graphique simule le survol
  const handleTouchChart = useCallback(
    (e: React.TouchEvent) => {
      const conteneur = conteneurRef.current;
      if (!conteneur) return;
      const touch = e.touches[0];
      const rect = conteneur.getBoundingClientRect();
      const s = sliderStyle ?? { left: 30, right: 5 };
      const zoneGauche = rect.left + s.left;
      const zoneDroite = rect.right - s.right;
      const largeurZone = zoneDroite - zoneGauche;
      const ratio = Math.max(0, Math.min(1, (touch.clientX - zoneGauche) / largeurZone));
      const idx = trouverPointParRatio(ratio);
      if (idx != null) {
        dernierPointSurvoleRef.current = idx;
        onHoverPoint(idx);
      }
    },
    [onHoverPoint, trouverPointParRatio, sliderStyle]
  );

  if (donneesActives.length < 2) {
    return (
      <div className="chart-empty">
        Pas assez de donnees pour afficher le graphique
      </div>
    );
  }

  const strokeId = "gradient-vitesse";

  // Titre et formateur selon le mode
  const titreActif = modeVent ? CONFIG_VENT.titre : config.titre;
  const formaterActif = modeVent ? CONFIG_VENT.formater : config.formater;

  return (
    <div className="chart-container" ref={conteneurRef} onTouchStart={handleTouchChart}>
      <h3 className="chart-title">{titreActif}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={donneesActives}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClickPoint ? handleClick : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COULEURS.grille} />
          <XAxis
            dataKey="temps"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => format(new Date(t), "HH:mm")}
            tick={{ fontSize: 11, fill: "#aaa" }}
            stroke="#ccc"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aaa" }}
            stroke="#ccc"
            width={25}
            domain={modeVent ? undefined : config.domaine}
          />
          <Tooltip
            labelFormatter={(t) =>
              format(new Date(t as number), "HH:mm:ss")
            }
            formatter={(value) => [formaterActif(Number(value)), titreActif]}
            contentStyle={{
              backgroundColor: COULEURS.fond,
              border: `1px solid ${COULEURS.bordure}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {!modeVent && gradientStops && (
            <defs>
              <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                {gradientStops.map((stop, i) => (
                  <stop
                    key={i}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            </defs>
          )}
          <Line
            type="monotone"
            dataKey="valeur"
            stroke={modeVent ? "#43728B" : `url(#${strokeId})`}
            dot={false}
            strokeWidth={1.5}
          />
          {tempsSurvole && (
            <ReferenceLine
              x={tempsSurvole}
              stroke={COULEURS.jaune}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Slider sur l'axe X — aligne dynamiquement sur la zone de tracage */}
      <div
        className="chart-slider-zone"
        style={sliderStyle ? {
          left: sliderStyle.left,
          right: sliderStyle.right,
          bottom: sliderStyle.bottom,
        } : { display: "none" }}
      >
        {positionThumbFixe != null && (
          <>
            <div
              className="chart-slider-track"
              style={{ width: `${positionThumbFixe}%` }}
            />
            <div
              className="chart-slider-thumb"
              style={{ left: `${positionThumbFixe}%` }}
              onMouseDown={handleThumbMouseDown}
              onTouchStart={handleThumbTouchStart}
            />
          </>
        )}
      </div>
    </div>
  );
}
