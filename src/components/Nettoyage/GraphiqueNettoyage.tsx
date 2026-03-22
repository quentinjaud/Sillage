"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  ReferenceDot,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { COULEURS } from "@/lib/theme";
import type { PointNettoyage } from "@/lib/types";
import { sousechantillonner } from "@/lib/utilitaires";

interface PropsGraphiqueNettoyage {
  points: PointNettoyage[];
  pointSurvole: number | null;
  onHoverPoint: (pointIndex: number | null) => void;
  onSelectRange: (debut: number, fin: number) => void;
}

interface DonneeGraphique {
  pointIndex: number;
  heure: string;
  vitesse: number;
  isExcluded: boolean;
  isAberrant: boolean;
}

export default function GraphiqueNettoyage({
  points,
  pointSurvole,
  onHoverPoint,
  onSelectRange,
}: PropsGraphiqueNettoyage) {
  const brushRef = useRef<{ startIndex: number; endIndex: number } | null>(null);

  const donneesCompletes = useMemo(() => {
    return points
      .filter((p) => p.timestamp && p.speedKn !== null)
      .map((p) => ({
        pointIndex: p.pointIndex,
        heure: p.timestamp!,
        vitesse: p.speedKn!,
        isExcluded: p.isExcluded,
        isAberrant: p.typeAberrant !== null,
      }));
  }, [points]);

  const donnees = useMemo(
    () => sousechantillonner(donneesCompletes, 800),
    [donneesCompletes]
  );

  // Points aberrants pour les marqueurs rouges
  const pointsAberrants = useMemo(
    () => donnees.filter((d) => d.isAberrant),
    [donnees]
  );

  const handleBrushChange = useCallback(
    (brushData: { startIndex?: number; endIndex?: number }) => {
      if (
        brushData.startIndex !== undefined &&
        brushData.endIndex !== undefined
      ) {
        brushRef.current = {
          startIndex: brushData.startIndex,
          endIndex: brushData.endIndex,
        };
        const debut = donnees[brushData.startIndex]?.pointIndex;
        const fin = donnees[brushData.endIndex]?.pointIndex;
        if (debut !== undefined && fin !== undefined) {
          onSelectRange(debut, fin);
        }
      }
    },
    [donnees, onSelectRange]
  );

  // Trouver l'heure du point survolé depuis la carte
  const heureSurvole = useMemo(() => {
    if (pointSurvole === null) return null;
    const d = donnees.find((d) => d.pointIndex === pointSurvole);
    return d?.heure ?? null;
  }, [pointSurvole, donnees]);

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      // Recharts peut passer (state, event) ou juste (state)
      const state = args[0];
      if (state?.activePayload?.[0]?.payload?.pointIndex !== undefined) {
        onHoverPoint(state.activePayload[0].payload.pointIndex);
      } else if (state?.activeLabel) {
        // Fallback : chercher par label (heure)
        const point = donnees.find((d) => d.heure === state.activeLabel);
        if (point) onHoverPoint(point.pointIndex);
      }
    },
    [onHoverPoint, donnees]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  if (donnees.length < 2) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart
        data={donnees}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COULEURS.grille}
          opacity={0.5}
        />
        <XAxis
          dataKey="heure"
          tickFormatter={(t) => format(new Date(t), "HH:mm")}
          tick={{ fontSize: 10 }}
          stroke={COULEURS.texteSecondaire}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          stroke={COULEURS.texteSecondaire}
          width={35}
          label={{
            value: "kn",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 10 },
          }}
        />
        <Tooltip
          labelFormatter={(t) => format(new Date(t as string), "HH:mm:ss")}
          formatter={(value) => [`${Number(value).toFixed(1)} kn`, "Vitesse"]}
          contentStyle={{
            backgroundColor: "rgba(255,253,249,0.95)",
            border: `1px solid ${COULEURS.bordure}`,
            borderRadius: 8,
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="vitesse"
          stroke={COULEURS.accent}
          dot={false}
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />
        {/* Marqueurs rouges pour les points aberrants */}
        {pointsAberrants.map((p) => (
          <ReferenceDot
            key={p.pointIndex}
            x={p.heure}
            y={p.vitesse}
            r={4}
            fill={COULEURS.danger}
            stroke={COULEURS.danger}
            strokeWidth={1}
          />
        ))}
        {/* Curseur synchronisé depuis la carte */}
        {heureSurvole && (
          <ReferenceLine
            x={heureSurvole}
            stroke={COULEURS.jaune}
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}
        <Brush
          dataKey="heure"
          height={20}
          stroke={COULEURS.accent}
          fill="rgba(255,253,249,0.8)"
          onChange={handleBrushChange}
          tickFormatter={(t) => format(new Date(t), "HH:mm")}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
