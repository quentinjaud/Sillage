"use client";

import { useCallback, useMemo } from "react";
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
import type { PointCarte, DonneeGraphee } from "@/lib/types";
import { sousechantillonner } from "@/lib/utilitaires";

interface PropsTraceChart {
  points: PointCarte[];
  donnee: DonneeGraphee;
  pointActifIndex: number | null;
  onHoverPoint: (pointIndex: number | null) => void;
}

const CONFIG_DONNEES: Record<
  DonneeGraphee,
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
  heure: string;
  valeur: number;
  pointIndex: number;
}

export default function TraceChart({
  points,
  donnee,
  pointActifIndex,
  onHoverPoint,
}: PropsTraceChart) {
  const config = CONFIG_DONNEES[donnee];

  const donneesGraphique = useMemo(
    () =>
      sousechantillonner(
        points
          .filter(
            (p) =>
              p.timestamp != null && (p[config.cle] as number | null) != null
          )
          .map((p, i) => ({
            heure: p.timestamp!,
            valeur: p[config.cle] as number,
            pointIndex: p.pointIndex ?? i,
          })),
        500
      ),
    [points, donnee]
  );

  const gradientStops = useMemo(() => {
    if (donnee !== "vitesse") return null;
    const stats = calculerStatsVitesse(
      donneesGraphique.map((d) => d.valeur)
    );
    return donneesGraphique.map((d, i) => ({
      offset: `${(i / Math.max(donneesGraphique.length - 1, 1)) * 100}%`,
      color: vitesseVersCouleur(d.valeur, stats),
    }));
  }, [donneesGraphique, donnee]);

  const heureSurvole = useMemo(() => {
    if (pointActifIndex == null) return null;
    const d = donneesGraphique.find((d) => d.pointIndex === pointActifIndex);
    return d?.heure ?? null;
  }, [pointActifIndex, donneesGraphique]);

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      const state = args[0];
      if (state?.activePayload?.[0]?.payload?.pointIndex !== undefined) {
        onHoverPoint(state.activePayload[0].payload.pointIndex);
      } else if (state?.activeLabel) {
        const point = donneesGraphique.find(
          (d) => d.heure === state.activeLabel
        );
        if (point) onHoverPoint(point.pointIndex);
      }
    },
    [onHoverPoint, donneesGraphique]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  if (donneesGraphique.length < 2) {
    return (
      <div className="chart-empty">
        Pas assez de donnees pour afficher le graphique
      </div>
    );
  }

  const strokeId = `gradient-${donnee}`;
  const stroke =
    donnee === "vitesse" ? `url(#${strokeId})` : COULEURS.accent;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{config.titre}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={donneesGraphique}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COULEURS.grille} />
          <XAxis
            dataKey="heure"
            tickFormatter={(t) => format(new Date(t), "HH:mm")}
            tick={{ fontSize: 11 }}
            stroke={COULEURS.texteSecondaire}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke={COULEURS.texteSecondaire}
            width={25}
            domain={config.domaine}
          />
          <Tooltip
            labelFormatter={(t) =>
              format(new Date(t as string), "HH:mm:ss")
            }
            formatter={(value) => [config.formater(Number(value)), config.titre]}
            contentStyle={{
              backgroundColor: COULEURS.fond,
              border: `1px solid ${COULEURS.bordure}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {donnee === "vitesse" && gradientStops && (
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
            stroke={stroke}
            dot={false}
            strokeWidth={1.5}
          />
          {heureSurvole && (
            <ReferenceLine
              x={heureSurvole}
              stroke={COULEURS.jaune}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
