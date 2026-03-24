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
import { interpolerCirculaire, calculerTWA, bordTWA } from "@/lib/geo/twa";
import { IconeTWA } from "@/components/IconeTWA";
import { Gauge, Compass, Wind, Navigation2 } from "lucide-react";
import {
  calculerStatsVitesse,
  vitesseVersCouleur,
} from "@/lib/geo/couleur-vitesse";
import type { PointCarte, DonneeGraphee, CelluleMeteoClient } from "@/lib/types";
import { sousechantillonner } from "@/lib/utilitaires";
import { trouverCelluleActive } from "@/lib/geo/stats-vent";

interface PropsTraceChart {
  points: PointCarte[];
  donnee: DonneeGraphee;
  pointActifIndex: number | null;
  pointFixeIndex: number | null;
  onHoverPoint: (pointIndex: number | null) => void;
  onClickPoint?: (pointIndex: number | null) => void;
  cellulesMeteo?: CelluleMeteoClient[];
  compact?: boolean;
  /** Zoom temporel — timestamp debut en ms (optionnel) */
  rangeDebut?: number | null;
  /** Zoom temporel — timestamp fin en ms (optionnel) */
  rangeFin?: number | null;
  /** Callback quand la plage de zoom change */
  onRangeChange?: (debut: number, fin: number) => void;
  /** Reset le zoom */
  onRangeReset?: () => void;
}

const CONFIG_DONNEES: Record<
  Exclude<DonneeGraphee, "vent" | "ventDirection" | "twa">,
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
    unite: "kt",
    formater: (v) => `${v.toFixed(1)} kt`,
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
  unite: "kt",
  formater: (v: number) => `${v.toFixed(1)} kt`,
};

const CONFIG_VENT_DIR = {
  titre: "Direction vent",
  unite: "°",
  formater: (v: number) => `${Math.round(v)}°`,
  domaine: [0, 360] as [number, number],
};

export default function TraceChart({
  points,
  donnee,
  pointActifIndex,
  pointFixeIndex,
  onHoverPoint,
  onClickPoint,
  cellulesMeteo,
  compact,
  rangeDebut,
  rangeFin,
  onRangeChange,
  onRangeReset,
}: PropsTraceChart) {
  // Mode vent actif si donnee === "vent" ou "ventDirection" ET des cellules sont disponibles
  const modeVent = (donnee === "vent" || donnee === "ventDirection") && (cellulesMeteo?.length ?? 0) > 0;
  const modeVentDirection = donnee === "ventDirection" && (cellulesMeteo?.length ?? 0) > 0;
  const modeTWA = donnee === "twa";

  // Pour les modes vitesse/cap, repli sur vitesse si vent sans cellules
  const donneeEffective: Exclude<DonneeGraphee, "vent" | "ventDirection" | "twa"> =
    (donnee === "vent" || donnee === "ventDirection" || donnee === "twa") ? "vitesse" : donnee;
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

  // Interpoler une valeur vent sur un timestamp GPS a partir des cellules meteo
  // Pour chaque point GPS, trouve la cellule correspondante (ou interpole entre deux)
  const interpolerVentSurPoints = useCallback(
    (champ: "ventVitesseKn" | "ventDirectionDeg"): DonneeGraphique[] => {
      if (!cellulesMeteo || cellulesMeteo.length === 0) return [];

      // Construire une timeline triee des valeurs vent (centre de chaque heure, dedup)
      const timeline: { temps: number; valeur: number }[] = [];
      const vus = new Set<number>();
      for (const c of cellulesMeteo) {
        const centre = Math.round(
          (new Date(c.dateDebut).getTime() + new Date(c.dateFin).getTime()) / 2
        );
        if (!vus.has(centre)) {
          vus.add(centre);
          timeline.push({ temps: centre, valeur: c[champ] });
        }
      }
      timeline.sort((a, b) => a.temps - b.temps);

      if (timeline.length === 0) return [];

      // Projeter chaque point GPS sur la timeline vent par interpolation lineaire
      return sousechantillonner(
        points
          .filter((p) => p.timestamp != null)
          .map((p, i) => {
            const t = new Date(p.timestamp!).getTime();

            // Avant le premier ou apres le dernier : valeur constante
            if (t <= timeline[0].temps) {
              return { temps: t, heure: p.timestamp!, valeur: timeline[0].valeur, pointIndex: p.pointIndex ?? i };
            }
            if (t >= timeline[timeline.length - 1].temps) {
              return { temps: t, heure: p.timestamp!, valeur: timeline[timeline.length - 1].valeur, pointIndex: p.pointIndex ?? i };
            }

            // Trouver les deux points encadrants et interpoler
            let j = 0;
            while (j < timeline.length - 1 && timeline[j + 1].temps < t) j++;
            const a = timeline[j];
            const b = timeline[j + 1];
            const ratio = (t - a.temps) / (b.temps - a.temps);
            const valeur = champ === "ventDirectionDeg"
              ? interpolerCirculaire(a.valeur, b.valeur, ratio)
              : a.valeur + ratio * (b.valeur - a.valeur);

            return { temps: t, heure: p.timestamp!, valeur, pointIndex: p.pointIndex ?? i };
          }),
        500
      );
    },
    [cellulesMeteo, points]
  );

  const interpolerCapSurPoints = useCallback((): (number | null)[] => {
    const caps = points.map((p) => p.headingDeg);
    for (let i = 0; i < caps.length; i++) {
      if (caps[i] != null) continue;
      let gauche = i - 1;
      while (gauche >= 0 && caps[gauche] == null) gauche--;
      let droite = i + 1;
      while (droite < caps.length && caps[droite] == null) droite++;
      if (gauche < 0 || droite >= caps.length) continue;
      const ratio = (i - gauche) / (droite - gauche);
      caps[i] = interpolerCirculaire(caps[gauche]!, caps[droite]!, ratio);
    }
    return caps;
  }, [points]);

  // Datasets vent interpoles sur les points GPS (meme timeline que vitesse/cap)
  const donneesVent = useMemo(
    () => interpolerVentSurPoints("ventVitesseKn"),
    [interpolerVentSurPoints]
  );

  const donneesVentDir = useMemo(
    () => interpolerVentSurPoints("ventDirectionDeg"),
    [interpolerVentSurPoints]
  );

  const donneesTWA = useMemo(() => {
    if (!modeTWA || !cellulesMeteo?.length) return [];
    const ventDirs = interpolerVentSurPoints("ventDirectionDeg");
    if (!ventDirs.length) return [];
    const caps = interpolerCapSurPoints();
    const ventParIndex = new Map(ventDirs.map((v) => [v.pointIndex, v.valeur]));

    return sousechantillonner(
      points
        .filter((p) => p.timestamp != null)
        .map((p, i) => {
          const idx = p.pointIndex ?? i;
          const cap = caps[i];
          const ventDir = ventParIndex.get(idx);
          if (cap == null || ventDir == null) return null;
          return {
            temps: new Date(p.timestamp!).getTime(),
            heure: p.timestamp!,
            valeur: calculerTWA(cap, ventDir),
            pointIndex: idx,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null),
      500
    );
  }, [modeTWA, cellulesMeteo, points, interpolerVentSurPoints, interpolerCapSurPoints]);

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
  }, [donneesGraphique, donneesVent, donneesVentDir, donneesTWA]);

  // Dataset actif selon le mode
  const donneesActives = modeTWA ? donneesTWA : modeVentDirection ? donneesVentDir : modeVent ? donneesVent : donneesGraphique;

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

  // Positions des range thumbs pour le zoom temporel (en %)
  const positionRangeDebut = useMemo(() => {
    if (rangeDebut == null || duree === 0) return null;
    return ((rangeDebut - tempsDebut) / duree) * 100;
  }, [rangeDebut, tempsDebut, duree]);

  const positionRangeFin = useMemo(() => {
    if (rangeFin == null || duree === 0) return null;
    return ((rangeFin - tempsDebut) / duree) * 100;
  }, [rangeFin, tempsDebut, duree]);

  // Drag generique pour les range thumbs
  const deplacerRangeThumb = useCallback(
    (clientX: number, which: "debut" | "fin") => {
      if (!onRangeChange) return;
      const conteneur = conteneurRef.current;
      if (!conteneur) return;
      const rect = conteneur.getBoundingClientRect();
      const s = sliderStyle ?? { left: 30, right: 5 };
      const zoneGauche = rect.left + s.left;
      const zoneDroite = rect.right - s.right;
      const largeurZone = zoneDroite - zoneGauche;
      const ratio = Math.max(0, Math.min(1, (clientX - zoneGauche) / largeurZone));
      const temps = tempsDebut + ratio * duree;
      if (which === "debut") {
        onRangeChange(temps, rangeFin ?? tempsDebut + duree);
      } else {
        onRangeChange(rangeDebut ?? tempsDebut, temps);
      }
    },
    [onRangeChange, sliderStyle, tempsDebut, duree, rangeDebut, rangeFin]
  );

  const handleRangeThumbMouseDown = useCallback(
    (which: "debut" | "fin") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const handleMove = (ev: MouseEvent) => deplacerRangeThumb(ev.clientX, which);
      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [deplacerRangeThumb]
  );

  const handleRangeThumbTouchStart = useCallback(
    (which: "debut" | "fin") => (e: React.TouchEvent) => {
      e.stopPropagation();
      const handleMove = (ev: TouchEvent) => {
        ev.preventDefault();
        deplacerRangeThumb(ev.touches[0].clientX, which);
      };
      const handleEnd = () => {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [deplacerRangeThumb]
  );

  // Position et contenu du tooltip actif (toujours nav + vent si dispo)
  const tooltipActif = useMemo(() => {
    if (pointActifIndex == null || donneesActives.length < 2) return null;
    const d = donneesActives.find((d) => d.pointIndex === pointActifIndex);
    if (!d) return null;
    const pct = ((d.temps - tempsDebut) / duree) * 100;
    const heure = format(new Date(d.temps), "HH:mm:ss");
    const ts = new Date(d.temps).toISOString();

    // Donnees nav
    const pointGps = points.find((p) => p.timestamp && Math.abs(new Date(p.timestamp).getTime() - d.temps) < 5000);
    const vitesse = pointGps?.speedKn ?? null;
    const cap = pointGps?.headingDeg ?? null;

    // Donnees vent
    const cellule = cellulesMeteo?.length
      ? trouverCelluleActive(cellulesMeteo, ts, pointGps?.lat ?? 0, pointGps?.lon ?? 0)
      : null;

    // Donnees TWA
    const twa = (cap != null && cellule)
      ? calculerTWA(cap, cellule.ventDirectionDeg)
      : null;

    return { pct, heure, vitesse, cap, force: cellule ? Math.round(cellule.ventVitesseKn) : null, dir: cellule ? Math.round(cellule.ventDirectionDeg) : null, twa };
  }, [pointActifIndex, donneesActives, tempsDebut, duree, cellulesMeteo, points]);

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
  const configVentActif = modeVentDirection ? CONFIG_VENT_DIR : CONFIG_VENT;
  const titreActif = modeTWA ? "TWA" : modeVent ? configVentActif.titre : config.titre;
  const formaterActif = modeTWA ? ((v: number) => `${Math.round(v)}°`) : modeVent ? configVentActif.formater : config.formater;

  return (
    <div className={`chart-container${compact ? " chart-container--compact" : ""}`} ref={conteneurRef} onTouchStart={handleTouchChart} onDoubleClick={onRangeReset}>
      {!compact && <h3 className="chart-title">{titreActif}</h3>}
      {compact && <span className="chart-title-compact">{titreActif}</span>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={donneesActives}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={onClickPoint ? handleClick : undefined}
          margin={compact ? { top: 4, right: 4, bottom: 0, left: 0 } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COULEURS.grille} />
          <XAxis
            dataKey="temps"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => format(new Date(t), "HH:mm")}
            tick={compact ? false : { fontSize: 11, fill: "#aaa" }}
            stroke={compact ? "transparent" : "#ccc"}
            height={compact ? 0 : undefined}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#aaa" }}
            stroke="#ccc"
            width={25}
            domain={modeTWA ? [-180, 180] : modeVent ? (modeVentDirection ? CONFIG_VENT_DIR.domaine : undefined) : config.domaine}
            ticks={modeTWA ? [-180, -90, 0, 90, 180] : undefined}
          />
          <Tooltip content={() => null} />
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
            stroke={modeVent ? "white" : `url(#${strokeId})`}
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

        {/* Range selection (zoom temporel) */}
        {positionRangeDebut != null && positionRangeFin != null && (
          <>
            <div
              className="chart-range-highlight"
              style={{
                left: `${Math.min(positionRangeDebut, positionRangeFin)}%`,
                width: `${Math.abs(positionRangeFin - positionRangeDebut)}%`,
              }}
            />
            <div
              className="chart-range-thumb chart-range-thumb--debut"
              style={{ left: `${positionRangeDebut}%` }}
              onMouseDown={handleRangeThumbMouseDown("debut")}
              onTouchStart={handleRangeThumbTouchStart("debut")}
            />
            <div
              className="chart-range-thumb chart-range-thumb--fin"
              style={{ left: `${positionRangeFin}%` }}
              onMouseDown={handleRangeThumbMouseDown("fin")}
              onTouchStart={handleRangeThumbTouchStart("fin")}
            />
          </>
        )}
      </div>

      {/* HUD zoom temporel */}
      {rangeDebut != null && rangeFin != null && onRangeReset && (
        <div className="chart-zoom-hud">
          <span>{format(new Date(Math.min(rangeDebut, rangeFin)), "HH:mm")}</span>
          <span className="chart-zoom-hud-arrow">→</span>
          <span>{format(new Date(Math.max(rangeDebut, rangeFin)), "HH:mm")}</span>
          <span className="chart-zoom-hud-duree">
            ({Math.round(Math.abs(rangeFin - rangeDebut) / 60000)} min)
          </span>
          <button className="chart-zoom-hud-reset" onClick={onRangeReset} title="Reinitialiser le zoom">
            ✕
          </button>
        </div>
      )}

      {/* Tooltip custom — positionne via pointActifIndex, visible sur les deux graphs */}
      {tooltipActif && (() => {
        const ml = sliderStyle?.left ?? 30;
        const mr = sliderStyle?.right ?? 5;
        const cw = conteneurRef.current?.clientWidth ?? 0;
        const px = ml + (tooltipActif.pct / 100) * (cw - ml - mr);
        // Interpoler le translateX de 0% (bord gauche) a -100% (bord droit)
        const ratio = cw > 0 ? px / cw : 0.5;
        const translateX = -(ratio * 100);
        return (
        <div
          className="chart-tooltip-custom"
          style={{ left: px, transform: `translateX(${translateX}%)` }}
        >
          <div className="chart-tooltip-compact">
            {!compact && <span className="chart-tooltip-heure">{tooltipActif.heure}</span>}
            {compact ? (
              <>
                {tooltipActif.force != null && (
                  <span className="chart-tooltip-val" style={donnee === "vent" ? { fontWeight: 600 } : undefined}>
                    <Wind size={11} /> {tooltipActif.force} kt
                  </span>
                )}
                {tooltipActif.dir != null && (
                  <span className="chart-tooltip-val" style={donnee === "ventDirection" ? { fontWeight: 600 } : undefined}>
                    <Navigation2 size={11} /> {tooltipActif.dir}°
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="chart-tooltip-val" style={donnee === "vitesse" ? { fontWeight: 600 } : undefined}>
                  <Gauge size={11} /> {tooltipActif.vitesse != null ? `${tooltipActif.vitesse.toFixed(1).padStart(4, "\u2007")} kt` : "\u2007\u2014\u2007"}
                </span>
                <span className="chart-tooltip-val" style={donnee === "cap" ? { fontWeight: 600 } : undefined}>
                  <Compass size={11} /> {tooltipActif.cap != null ? `${String(Math.round(tooltipActif.cap)).padStart(3, "\u2007")}°` : "\u2007\u2014\u2007"}
                </span>
                {tooltipActif.twa != null && (
                  <span className="chart-tooltip-val" style={donnee === "twa" ? { fontWeight: 600 } : undefined}>
                    <IconeTWA size={11} /> {String(Math.abs(Math.round(tooltipActif.twa))).padStart(3, "\u2007")}° {bordTWA(tooltipActif.twa)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
