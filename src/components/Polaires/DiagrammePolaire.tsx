'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import type { PolaireReference, PointCourbe } from '@/lib/polaires/types';
import { COULEURS_TWS, VIEWBOX_DEFAUT, SCALE_RADIUS } from '@/lib/polaires/constantes';
import {
  catmullRomPath,
  coordPolaire,
  calculerVentApparent,
  pasEchelle,
  construirePointsCourbe,
} from '@/lib/polaires/geometrie-polaire';
import { getRefSpeed } from '@/lib/polaires/interpolation';

// ── Types ──

interface PropsDiagramme {
  tws: number[];
  twa: number[];
  speeds: number[][];
  visibleTWS: Set<number>;
  montrerApparent: boolean;
  ref: PolaireReference | null;
}

interface DonneePoint {
  cx: number;
  cy: number;
  twa: number;
  tws: number;
  bs: number;
  awa: number;
  aws: number;
}

// ── Styles inline (sera migre vers globals.css) ──

const STYLES = `
.diagramme-polaire-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.diagramme-polaire-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.grid-circle {
  stroke: #ddd;
  fill: none;
  stroke-width: 0.5;
}
.grid-line {
  stroke: #ccc;
  stroke-width: 0.3;
}
.grid-label {
  fill: #999;
  font-size: 10px;
  text-anchor: middle;
}
.speed-label {
  fill: #999;
  font-size: 8px;
}
.polar-curve {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}
.polar-curve--ref {
  stroke: #999;
  opacity: 0.5;
}
.polar-curve--apparent {
  stroke-dasharray: 0.1 3;
  stroke-linecap: round;
  stroke-width: 1.2;
  opacity: 0.6;
}
.polar-dot {
  fill: white;
  stroke: #999;
  stroke-width: 1;
  opacity: 0;
  cursor: pointer;
}
.polar-dot.active {
  opacity: 1;
  r: 5;
}
.polaires-tooltip {
  position: absolute;
  background: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, -100%);
  margin-top: -8px;
  z-index: 10;
}
.polaires-tooltip .tooltip-apparent {
  color: #aaa;
  font-size: 11px;
}
.polaires-tooltip .tooltip-ref {
  color: #ccc;
  font-size: 11px;
}
.polaires-tooltip .tooltip-faster {
  color: #4CAF50;
}
.polaires-tooltip .tooltip-slower {
  color: #FF5722;
}
`;

// ── Composant ──

export default function DiagrammePolaire({
  tws,
  twa,
  speeds,
  visibleTWS,
  montrerApparent,
  ref: refPolaire,
}: PropsDiagramme) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const viewBoxRef = useRef({ ...VIEWBOX_DEFAUT });
  const pointsDataRef = useRef<DonneePoint[]>([]);

  // ── Calcul du SVG (grille + courbes) ──

  const { grilleSvg, courbesSvg, pointsDonnees } = useMemo(() => {
    // Vitesse max visible (donnees + ref)
    const visibleTWSValues = new Set<number>();
    visibleTWS.forEach((ci) => {
      if (ci < tws.length) visibleTWSValues.add(tws[ci]);
    });

    let maxSpeed = 0;
    speeds.forEach((row) => {
      row.forEach((v, ci) => {
        if (visibleTWS.has(ci) && v > maxSpeed) maxSpeed = v;
      });
    });
    if (refPolaire) {
      refPolaire.speeds.forEach((row) => {
        row.forEach((v, ci) => {
          if (visibleTWSValues.has(refPolaire.tws[ci]) && v > maxSpeed) maxSpeed = v;
        });
      });
    }
    if (maxSpeed === 0) maxSpeed = 10;

    const speedStep = pasEchelle(maxSpeed);
    const maxRing = Math.ceil(maxSpeed / speedStep) * speedStep;
    const echelle = SCALE_RADIUS / maxRing;

    // ── Grille ──
    const grilleElements: React.JSX.Element[] = [];

    // Cercles de vitesse (semi-cercles droite)
    for (let s = speedStep; s <= maxRing; s += speedStep) {
      const r = s * echelle;
      grilleElements.push(
        <path
          key={`ring-${s}`}
          className="grid-circle"
          d={`M0,${(-r).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0,1 0,${r.toFixed(1)}`}
        />,
      );
      grilleElements.push(
        <text key={`speed-${s}`} className="speed-label" x={3} y={-r - 2}>
          {s} kn
        </text>,
      );
    }

    // Axe vertical (0 a 180)
    grilleElements.push(
      <line
        key="axis"
        className="grid-line"
        x1={0}
        y1={-SCALE_RADIUS - 5}
        x2={0}
        y2={SCALE_RADIUS + 5}
        style={{ strokeWidth: 0.5 }}
      />,
    );

    // Lignes radiales tous les 30 degres
    for (let deg = 0; deg <= 180; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const x = Math.sin(rad) * (SCALE_RADIUS + 5);
      const y = -Math.cos(rad) * (SCALE_RADIUS + 5);
      const lx = Math.sin(rad) * (SCALE_RADIUS + 18);
      const ly = -Math.cos(rad) * (SCALE_RADIUS + 18);

      grilleElements.push(
        <line key={`radial-${deg}`} className="grid-line" x1={0} y1={0} x2={x.toFixed(1)} y2={y.toFixed(1)} />,
      );
      grilleElements.push(
        <text key={`label-${deg}`} className="grid-label" x={lx.toFixed(1)} y={ly.toFixed(1)}>
          {deg}&deg;
        </text>,
      );
    }

    // ── Courbes polaires ──
    const courbesElements: React.JSX.Element[] = [];
    const points: DonneePoint[] = [];

    tws.forEach((twsVal, ci) => {
      if (twsVal === 0 || !visibleTWS.has(ci)) return;

      const couleur = COULEURS_TWS[ci % COULEURS_TWS.length];
      const pts = construirePointsCourbe(twa, speeds, ci, twsVal, echelle);

      if (pts.length < 2) return;

      const d = catmullRomPath(pts);
      courbesElements.push(
        <path key={`curve-${ci}`} className="polar-curve" d={d} stroke={couleur} />,
      );

      // Points interactifs
      pts.forEach((p, pi) => {
        courbesElements.push(
          <circle
            key={`dot-${ci}-${pi}`}
            className="polar-dot"
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={4}
            data-twa={p.twa}
            data-tws={twsVal}
            data-bs={p.bs}
            data-awa={p.awa}
            data-aws={p.aws}
          />,
        );
        points.push({
          cx: p.x,
          cy: p.y,
          twa: p.twa,
          tws: twsVal,
          bs: p.bs,
          awa: p.awa!,
          aws: p.aws!,
        });
      });
    });

    // ── Courbes vent apparent ──
    if (montrerApparent) {
      tws.forEach((twsVal, ci) => {
        if (twsVal === 0 || !visibleTWS.has(ci)) return;

        const couleur = COULEURS_TWS[ci % COULEURS_TWS.length];
        const aPts: { x: number; y: number }[] = [];

        twa.forEach((angle, ri) => {
          const bs = speeds[ri][ci];
          if (bs <= 0) return;
          const { awa, aws } = calculerVentApparent(angle, twsVal, bs);
          const { x, y } = coordPolaire(awa, bs, echelle);
          aPts.push({ x, y });
        });

        if (aPts.length < 2) return;

        courbesElements.push(
          <path
            key={`apparent-${ci}`}
            className="polar-curve polar-curve--apparent"
            d={catmullRomPath(aPts)}
            stroke={couleur}
          />,
        );
      });
    }

    // ── Courbes de reference ──
    if (refPolaire) {
      refPolaire.tws.forEach((twsVal, ci) => {
        if (twsVal === 0 || !visibleTWSValues.has(twsVal)) return;

        const pts: { x: number; y: number }[] = [];
        refPolaire.twa.forEach((angle, ri) => {
          const spd = refPolaire.speeds[ri][ci];
          if (spd <= 0) return;
          const { x, y } = coordPolaire(angle, spd, echelle);
          pts.push({ x, y });
        });

        if (pts.length < 2) return;

        courbesElements.push(
          <path
            key={`ref-${ci}`}
            className="polar-curve polar-curve--ref"
            d={catmullRomPath(pts)}
          />,
        );

        // Courbes apparentes pour la ref
        if (montrerApparent) {
          const aPts: { x: number; y: number }[] = [];
          refPolaire.twa.forEach((angle, ri) => {
            const bs = refPolaire.speeds[ri][ci];
            if (bs <= 0) return;
            const twaRad = (angle * Math.PI) / 180;
            const awx = twsVal * Math.sin(twaRad);
            const awy = twsVal * Math.cos(twaRad) + bs;
            const awa = Math.atan2(awx, awy);
            const r = bs * echelle;
            aPts.push({ x: Math.sin(awa) * r, y: -Math.cos(awa) * r });
          });
          if (aPts.length >= 2) {
            courbesElements.push(
              <path
                key={`ref-apparent-${ci}`}
                className="polar-curve polar-curve--ref polar-curve--apparent"
                d={catmullRomPath(aPts)}
              />,
            );
          }
        }
      });
    }

    return {
      grilleSvg: grilleElements,
      courbesSvg: courbesElements,
      pointsDonnees: points,
    };
  }, [tws, twa, speeds, visibleTWS, montrerApparent, refPolaire]);

  // Synchroniser les donnees de points pour le tooltip imperatif
  useEffect(() => {
    pointsDataRef.current = pointsDonnees;
  }, [pointsDonnees]);

  // ── Tooltip imperatif ──

  const gererTooltip = useCallback(
    (e: MouseEvent) => {
      const svg = svgRef.current;
      const tooltip = tooltipRef.current;
      const container = containerRef.current;
      if (!svg || !tooltip || !container) return;

      // Convertir position souris en coordonnees SVG
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

      // Trouver le point le plus proche
      const dots = pointsDataRef.current;
      let best: DonneePoint | null = null;
      let bestDist = Infinity;
      for (const d of dots) {
        const dx = d.cx - svgPt.x;
        const dy = d.cy - svgPt.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }

      // Desactiver tous les dots actifs
      const activeDots = svg.querySelectorAll('.polar-dot.active');
      activeDots.forEach((dot) => dot.classList.remove('active'));

      // Distance max ~30 unites SVG
      if (!best || bestDist > 900) {
        tooltip.hidden = true;
        return;
      }

      // Activer le point le plus proche
      const allDots = svg.querySelectorAll('.polar-dot');
      for (const dot of allDots) {
        const cx = parseFloat(dot.getAttribute('cx') || '0');
        const cy = parseFloat(dot.getAttribute('cy') || '0');
        if (Math.abs(cx - best.cx) < 0.1 && Math.abs(cy - best.cy) < 0.1) {
          dot.classList.add('active');
          break;
        }
      }

      // Position du tooltip
      const screenPt = svg.createSVGPoint();
      screenPt.x = best.cx;
      screenPt.y = best.cy;
      const pixel = screenPt.matrixTransform(svg.getScreenCTM()!);
      const rect = container.getBoundingClientRect();

      const bs = best.bs.toFixed(1);
      let html = `TWA ${best.twa}\u00B0  \u00B7  TWS ${best.tws} kn  \u00B7  Bs ${bs} kn`;
      html += `<br><span class="tooltip-apparent">AWA ${best.awa}\u00B0  \u00B7  AWS ${best.aws} kn</span>`;

      if (refPolaire) {
        const refSpd = getRefSpeed(refPolaire, best.twa, best.tws);
        if (refSpd !== null) {
          const diff = best.bs - refSpd;
          const arrow = diff > 0 ? '\u25B4' : diff < 0 ? '\u25BE' : '';
          const cls = diff > 0 ? 'tooltip-faster' : diff < 0 ? 'tooltip-slower' : '';
          html += `<br><span class="tooltip-ref">R\u00E9f: ${refSpd.toFixed(1)} kn`;
          if (Math.abs(diff) >= 0.05) {
            html += ` <span class="${cls}">(${arrow}${Math.abs(diff).toFixed(1)})</span>`;
          }
          html += '</span>';
        }
      }

      tooltip.innerHTML = html;
      tooltip.style.left = `${pixel.x - rect.left}px`;
      tooltip.style.top = `${pixel.y - rect.top}px`;
      tooltip.hidden = false;
    },
    [refPolaire],
  );

  const cacherTooltip = useCallback(() => {
    const svg = svgRef.current;
    const tooltip = tooltipRef.current;
    if (!svg || !tooltip) return;
    svg.querySelectorAll('.polar-dot.active').forEach((d) => d.classList.remove('active'));
    tooltip.hidden = true;
  }, []);

  // ── Zoom & Pan imperatif ──

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const vb = viewBoxRef.current;
    let isPanning = false;
    let startPt = { x: 0, y: 0 };
    let startVB = { ...vb };

    function appliquerViewBox() {
      svg!.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    }

    // Zoom a la molette vers le curseur
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

      const pt = svg!.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg!.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());

      const newW = vb.w * factor;
      const newH = vb.h * factor;

      // Limiter le zoom arriere
      if (newW > VIEWBOX_DEFAUT.w * 1.5 || newH > VIEWBOX_DEFAUT.h * 1.5) return;
      // Limiter le zoom avant
      if (newW < 30 || newH < 50) return;

      vb.x = svgPt.x - (svgPt.x - vb.x) * factor;
      vb.y = svgPt.y - (svgPt.y - vb.y) * factor;
      vb.w = newW;
      vb.h = newH;
      appliquerViewBox();
    }

    // Pan au clic gauche
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0 && e.button !== 1) return;
      isPanning = true;
      startPt = { x: e.clientX, y: e.clientY };
      startVB = { ...vb };
      svg!.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function onMouseMove(e: MouseEvent) {
      if (!isPanning) return;
      const ctm = svg!.getScreenCTM();
      if (!ctm) return;
      const dx = (e.clientX - startPt.x) / ctm.a;
      const dy = (e.clientY - startPt.y) / ctm.d;
      vb.x = startVB.x - dx;
      vb.y = startVB.y - dy;
      appliquerViewBox();
    }

    function onMouseUp() {
      if (isPanning) {
        isPanning = false;
        svg!.style.cursor = '';
      }
    }

    // Double-clic pour reinitialiser
    function onDblClick(e: MouseEvent) {
      e.preventDefault();
      Object.assign(vb, { ...VIEWBOX_DEFAUT });
      appliquerViewBox();
    }

    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    svg.addEventListener('dblclick', onDblClick);

    // Tooltip
    svg.addEventListener('mousemove', gererTooltip as EventListener);
    svg.addEventListener('mouseleave', cacherTooltip);

    // Appliquer le viewBox initial
    appliquerViewBox();

    return () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      svg.removeEventListener('dblclick', onDblClick);
      svg.removeEventListener('mousemove', gererTooltip as EventListener);
      svg.removeEventListener('mouseleave', cacherTooltip);
    };
  }, [gererTooltip, cacherTooltip]);

  // ── Rendu ──

  const viewBoxStr = `${VIEWBOX_DEFAUT.x} ${VIEWBOX_DEFAUT.y} ${VIEWBOX_DEFAUT.w} ${VIEWBOX_DEFAUT.h}`;

  return (
    <>
      <style>{STYLES}</style>
      <div ref={containerRef} className="diagramme-polaire-container">
        <svg
          ref={svgRef}
          className="diagramme-polaire-svg"
          viewBox={viewBoxStr}
        >
          {grilleSvg}
          {courbesSvg}
          <circle cx={0} cy={0} r={2} fill="var(--accent, #F6BC00)" />
        </svg>
        <div
          ref={tooltipRef}
          className="polaires-tooltip"
          hidden
        />
      </div>
    </>
  );
}
