// ============================================================
// Editeur de polaires Navimetrix
// Format .POL : tab-delimited, header TWA\TWS, vitesses en nœuds
// ============================================================

'use strict';

// ── Palette de couleurs pour les courbes TWS ──
const COLORS = [
  '#aaa',    // TWS=0 (gris)
  '#2196F3', '#0D47A1', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#FFEB3B', '#FF9800',
  '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#795548', '#607D8B'
];

// ── État global ──
const state = {
  tws: [],
  twa: [],
  speeds: [], // speeds[twaIdx][twsIdx]
  dirty: false,
  visibleTWS: new Set(), // TWS indices visible on chart
  showApparent: false,
  name: 'Sunlight 30', // current polaire name
  ref: null, // { tws, twa, speeds, name } or null
  refMode: 'absolu' // 'absolu' or 'delta'
};

// ── Données d'exemple (Sunlight 30 simplifié) ──
function loadDefaultData() {
  state.tws = [0, 6, 8, 10, 12, 14, 16, 20, 25, 30, 40];
  state.twa = [0, 32, 52, 60, 75, 90, 110, 120, 135, 150, 170, 180];
  state.speeds = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2.2, 2.9, 3.6, 4.2, 4.5, 4.6, 4.7, 4.5, 4.1, 2.3],
    [0, 3.8, 4.7, 5.3, 5.9, 6.2, 6.3, 6.4, 6.3, 6.0, 5.4],
    [0, 4.1, 5.0, 5.7, 6.2, 6.4, 6.6, 6.6, 6.6, 6.3, 5.8],
    [0, 4.3, 5.2, 5.9, 6.3, 6.6, 6.8, 7.0, 7.0, 6.7, 6.2],
    [0, 4.5, 5.5, 6.2, 6.6, 6.8, 6.9, 7.3, 7.3, 7.1, 6.6],
    [0, 4.5, 5.6, 6.3, 6.7, 7.0, 7.3, 7.8, 7.9, 7.9, 7.5],
    [0, 4.4, 5.4, 6.2, 6.6, 6.9, 7.2, 7.9, 8.3, 8.3, 8.1],
    [0, 4.1, 5.1, 5.9, 6.4, 6.7, 7.1, 7.7, 8.3, 8.6, 8.5],
    [0, 3.3, 4.3, 5.0, 5.7, 6.1, 6.4, 6.9, 8.1, 9.3, 9.9],
    [0, 2.7, 3.5, 4.3, 5.1, 5.6, 6.0, 6.4, 7.2, 8.2, 9.3],
    [0, 2.5, 3.3, 4.0, 4.8, 5.4, 5.8, 6.2, 6.9, 7.7, 8.5]
  ];
  state.dirty = false;
}

// ── DOM refs ──
const $table = document.getElementById('polar-table');
const $chart = document.getElementById('polar-chart');
const $legend = document.getElementById('chart-legend');
const $warnings = document.getElementById('warnings');
const $fileInput = document.getElementById('file-input');
const $fileInputRef = document.getElementById('file-input-ref');
const $selectRef = document.getElementById('select-ref');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  loadDefaultData();
  renderAll();
  updateImportButton();

  document.getElementById('btn-import').addEventListener('click', () => $fileInput.click());
  $fileInput.addEventListener('change', handleImport);
  document.getElementById('btn-export').addEventListener('click', handleExport);

  $selectRef.addEventListener('change', handleRefSelect);
  $fileInputRef.addEventListener('change', handleImportRef);
  loadRefIndex();
  document.getElementById('btn-add-twa').addEventListener('click', handleAddTWA);
  document.getElementById('btn-add-tws').addEventListener('click', handleAddTWS);

  // Ref mode toggle
  document.getElementById('ref-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    state.refMode = btn.dataset.mode;
    document.querySelectorAll('.ref-toggle__btn').forEach(b => b.classList.remove('ref-toggle__btn--active'));
    btn.classList.add('ref-toggle__btn--active');
    $table.classList.remove('ref-absolu', 'ref-delta');
    $table.classList.add('ref-' + state.refMode);
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  initZoomPan();
});

// ============================================================
// RENDER
// ============================================================

function renderAll() {
  // Init visibility: all TWS visible (except TWS=0)
  state.visibleTWS = new Set(state.tws.map((_, i) => i).filter(i => state.tws[i] > 0));
  renderTable();
  renderChart();
  renderLegend();
}

function renderChartAndLegend() {
  renderChart();
  renderLegend();
  updateTableDimming();
}

// Grey out table columns for hidden TWS
function updateTableDimming() {
  // Body cells have data-c attribute with real TWS index
  $table.querySelectorAll('td[data-c]').forEach(cell => {
    const ci = parseInt(cell.dataset.c);
    if (state.tws[ci] > 0) {
      cell.classList.toggle('dimmed', !state.visibleTWS.has(ci));
    }
  });
  // Headers: skip corner (idx 0), then map to visible TWS indices (TWS=0 is hidden)
  const visibleTwsIndices = state.tws.map((v, i) => i).filter(i => state.tws[i] > 0);
  const ths = $table.querySelectorAll('thead th');
  ths.forEach((th, idx) => {
    if (idx === 0) return; // skip corner
    const ci = visibleTwsIndices[idx - 1];
    if (ci !== undefined) {
      th.classList.toggle('dimmed', !state.visibleTWS.has(ci));
    }
  });
}

// ── Table ──
// Interpolate speed from ref polaire (bilinear on TWA × TWS)
function getRefSpeed(angle, twsVal) {
  if (!state.ref) return null;
  const { twa, tws, speeds } = state.ref;

  // Find bounding indices for TWA
  if (angle < twa[0] || angle > twa[twa.length - 1]) return null;
  let ri0 = 0;
  for (let i = 0; i < twa.length - 1; i++) {
    if (twa[i] <= angle && angle <= twa[i + 1]) { ri0 = i; break; }
  }
  const ri1 = twa[ri0] === angle ? ri0 : ri0 + 1;
  const twaFrac = ri0 === ri1 ? 0 : (angle - twa[ri0]) / (twa[ri1] - twa[ri0]);

  // Find bounding indices for TWS
  if (twsVal < tws[0] || twsVal > tws[tws.length - 1]) return null;
  let ci0 = 0;
  for (let i = 0; i < tws.length - 1; i++) {
    if (tws[i] <= twsVal && twsVal <= tws[i + 1]) { ci0 = i; break; }
  }
  const ci1 = tws[ci0] === twsVal ? ci0 : ci0 + 1;
  const twsFrac = ci0 === ci1 ? 0 : (twsVal - tws[ci0]) / (tws[ci1] - tws[ci0]);

  // Bilinear interpolation
  const v00 = speeds[ri0][ci0];
  const v01 = speeds[ri0][ci1];
  const v10 = speeds[ri1][ci0];
  const v11 = speeds[ri1][ci1];
  const top = v00 + (v01 - v00) * twsFrac;
  const bot = v10 + (v11 - v10) * twsFrac;
  return top + (bot - top) * twaFrac;
}

function renderTable() {
  const { tws, twa, speeds } = state;
  let html = '<thead><tr>';

  // Corner cell
  html += '<th class="corner">TWA \\ TWS</th>';

  // TWS headers (skip TWS=0)
  tws.forEach((v, ci) => {
    if (v === 0) return;
    html += `<th><span class="cell-value">${v}</span>`;
    html += `<button class="btn btn--icon btn--del" data-del-tws="${ci}" title="Supprimer TWS=${v}">&times;</button>`;
    html += '</th>';
  });
  html += '</tr></thead><tbody>';

  // Data rows (skip TWA=0)
  twa.forEach((angle, ri) => {
    if (angle === 0) return;
    const canDelete = true;
    html += '<tr>';
    html += `<td><span class="cell-value">${angle}</span>`;
    if (canDelete) {
      html += `<button class="btn btn--icon btn--del" data-del-twa="${ri}" title="Supprimer TWA=${angle}">&times;</button>`;
    }
    html += '</td>';

    speeds[ri].forEach((spd, ci) => {
      if (tws[ci] === 0) return; // hide TWS=0 column
      const editable = angle === 0 ? '' : 'contenteditable="true"';
      const refSpd = getRefSpeed(angle, tws[ci]);
      let refAttrs = '';
      if (refSpd !== null) {
        refAttrs = ` data-ref="${refSpd.toFixed(1)}"`;
        const diff = spd - refSpd;
        if (Math.abs(diff) >= 0.05) {
          const arrow = diff > 0 ? '▴' : '▾';
          refAttrs += ` data-delta="${arrow}${Math.abs(diff).toFixed(1)}"`;
          refAttrs += ` data-delta-sign="${diff > 0 ? 'faster' : 'slower'}"`;
        } else {
          refAttrs += ' data-delta="=" data-delta-sign="equal"';
        }
      }
      html += `<td ${editable} data-r="${ri}" data-c="${ci}"${refAttrs}>${spd.toFixed(1)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody>';
  $table.innerHTML = html;

  // Apply ref mode class
  $table.classList.remove('ref-absolu', 'ref-delta');
  if (state.ref) $table.classList.add('ref-' + state.refMode);

  // Bind cell editing
  $table.querySelectorAll('td[contenteditable]').forEach(td => {
    td.addEventListener('blur', handleCellEdit);
    td.addEventListener('keydown', handleCellKey);
  });

  // Bind delete buttons
  $table.querySelectorAll('[data-del-tws]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ci = parseInt(btn.dataset.delTws);
      deleteTWS(ci);
    });
  });
  $table.querySelectorAll('[data-del-twa]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ri = parseInt(btn.dataset.delTwa);
      deleteTWA(ri);
    });
  });
}

// ── Cell editing ──
function handleCellEdit(e) {
  const td = e.target;
  const ri = parseInt(td.dataset.r);
  const ci = parseInt(td.dataset.c);
  const raw = td.textContent.trim().replace(',', '.');
  const val = parseFloat(raw);

  if (isNaN(val) || val < 0) {
    td.textContent = state.speeds[ri][ci].toFixed(1);
    td.classList.add('invalid');
    setTimeout(() => td.classList.remove('invalid'), 500);
    return;
  }

  state.speeds[ri][ci] = val;
  td.textContent = val.toFixed(1);
  state.dirty = true;
  renderChart();
  renderLegend();
}

function handleCellKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  }
  if (e.key === 'Tab') {
    // Natural tab navigation works fine with contenteditable
  }
}

// ── Add/Delete rows and columns ──
function handleAddTWA() {
  const input = prompt('Angle TWA (0-180) :');
  if (input === null) return;
  const val = parseFloat(input);
  if (isNaN(val) || val < 0 || val > 180) return alert('Valeur invalide (0-180)');
  if (state.twa.includes(val)) return alert('Cet angle existe deja');

  state.twa.push(val);
  state.speeds.push(new Array(state.tws.length).fill(0));
  sortData();
  state.dirty = true;
  renderAll();
}

function handleAddTWS() {
  const input = prompt('Vitesse vent TWS (noeuds) :');
  if (input === null) return;
  const val = parseFloat(input);
  if (isNaN(val) || val < 0) return alert('Valeur invalide (>= 0)');
  if (state.tws.includes(val)) return alert('Cette vitesse existe deja');

  state.tws.push(val);
  state.speeds.forEach(row => row.push(0));
  sortData();
  state.dirty = true;
  renderAll();
}

function deleteTWA(ri) {
  if (state.twa[ri] === 0) return;
  state.twa.splice(ri, 1);
  state.speeds.splice(ri, 1);
  state.dirty = true;
  renderAll();
}

function deleteTWS(ci) {
  if (state.tws[ci] === 0) return;
  state.tws.splice(ci, 1);
  state.speeds.forEach(row => row.splice(ci, 1));
  state.dirty = true;
  renderAll();
}

function sortData() {
  // Build combined array, sort, then unpack
  const combined = state.twa.map((angle, i) => ({
    angle,
    row: state.speeds[i]
  }));
  combined.sort((a, b) => a.angle - b.angle);
  state.twa = combined.map(c => c.angle);
  state.speeds = combined.map(c => c.row);

  // Sort TWS columns
  const twsOrder = state.tws.map((v, i) => ({ v, i }));
  twsOrder.sort((a, b) => a.v - b.v);
  state.tws = twsOrder.map(o => o.v);
  state.speeds = state.speeds.map(row => twsOrder.map(o => row[o.i]));
}

// ============================================================
// CHART SVG
// ============================================================

// Catmull-Rom spline → SVG cubic bezier path
function catmullRomPath(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }

  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  const n = pts.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 >= n ? n - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / (6 / tension);
    const cp1y = p1.y + (p2.y - p0.y) / (6 / tension);
    const cp2x = p2.x - (p3.x - p1.x) / (6 / tension);
    const cp2y = p2.y - (p3.y - p1.y) / (6 / tension);

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function renderChart() {
  const { tws, twa, speeds } = state;

  // Find max speed for scale (only visible TWS, include ref if loaded)
  let maxSpeed = 0;
  const visibleTWSValues = new Set();
  state.visibleTWS.forEach(ci => { visibleTWSValues.add(tws[ci]); });

  speeds.forEach(row => {
    row.forEach((v, ci) => { if (state.visibleTWS.has(ci) && v > maxSpeed) maxSpeed = v; });
  });
  if (state.ref) {
    state.ref.speeds.forEach(row => {
      row.forEach((v, ci) => { if (visibleTWSValues.has(state.ref.tws[ci]) && v > maxSpeed) maxSpeed = v; });
    });
  }
  if (maxSpeed === 0) maxSpeed = 10;

  // Scale: radius 220 = maxSpeed, add margin
  const scaleRadius = 210;
  const speedStep = niceStep(maxSpeed);
  const maxRing = Math.ceil(maxSpeed / speedStep) * speedStep;
  const scale = scaleRadius / maxRing;

  let svg = '';


  // Grid semi-circles (right half only)
  for (let s = speedStep; s <= maxRing; s += speedStep) {
    const r = s * scale;
    svg += `<path class="grid-circle" d="M0,${(-r).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0,1 0,${r.toFixed(1)}"/>`;
    svg += `<text class="speed-label" x="3" y="${(-r - 2).toFixed(1)}">${s} kn</text>`;
  }

  // Vertical axis line (0° to 180°)
  svg += `<line class="grid-line" x1="0" y1="${-scaleRadius - 5}" x2="0" y2="${scaleRadius + 5}" style="stroke-width:0.5"/>`;


  // Radial lines every 30 degrees (starboard only, 0-180)
  for (let deg = 0; deg <= 180; deg += 30) {
    const rad = deg * Math.PI / 180;
    const x = Math.sin(rad) * (scaleRadius + 5);
    const y = -Math.cos(rad) * (scaleRadius + 5);

    svg += `<line class="grid-line" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;

    // Label
    const lx = Math.sin(rad) * (scaleRadius + 18);
    const ly = -Math.cos(rad) * (scaleRadius + 18);
    svg += `<text class="grid-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${deg}°</text>`;
  }

  // Polar curves (one per TWS, skip TWS=0 and hidden)
  tws.forEach((twsVal, ci) => {
    if (twsVal === 0 || !state.visibleTWS.has(ci)) return;

    const color = COLORS[ci % COLORS.length];
    const pts = [];

    twa.forEach((angle, ri) => {
      const spd = speeds[ri][ci];
      if (spd <= 0) return;
      const rad = angle * Math.PI / 180;
      const r = spd * scale;
      const x = Math.sin(rad) * r;
      const y = -Math.cos(rad) * r;
      pts.push({ x, y, twa: angle, bs: spd });
    });

    if (pts.length < 2) return;

    const d = catmullRomPath(pts);
    svg += `<path class="polar-curve" d="${d}" stroke="${color}"/>`;

    // Interactive dots on data points (with precomputed AWA/AWS)
    pts.forEach(p => {
      const twaRad = p.twa * Math.PI / 180;
      const awx = twsVal * Math.sin(twaRad);
      const awy = twsVal * Math.cos(twaRad) + p.bs;
      const aws = Math.sqrt(awx * awx + awy * awy);
      const awa = Math.atan2(awx, awy) * 180 / Math.PI;
      svg += `<circle class="polar-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" data-twa="${p.twa}" data-tws="${twsVal}" data-bs="${p.bs}" data-awa="${(Math.round(awa*10)/10)}" data-aws="${(Math.round(aws*10)/10)}"/>`;
    });
  });

  // Apparent wind curves
  if (state.showApparent) {
    tws.forEach((twsVal, ci) => {
      if (twsVal === 0 || !state.visibleTWS.has(ci)) return;

      const color = COLORS[ci % COLORS.length];
      const aPts = [];

      twa.forEach((angle, ri) => {
        const bs = speeds[ri][ci];
        if (bs <= 0) return;
        const twaRad = angle * Math.PI / 180;
        // AWA/AWS formulas
        const awx = twsVal * Math.sin(twaRad);
        const awy = twsVal * Math.cos(twaRad) + bs;
        const aws = Math.sqrt(awx * awx + awy * awy);
        const awa = Math.atan2(awx, awy) * 180 / Math.PI;

        const rad = awa * Math.PI / 180;
        const r = bs * scale;
        const x = Math.sin(rad) * r;
        const y = -Math.cos(rad) * r;
        aPts.push({ x, y, twa: angle, bs, awa: Math.round(awa * 10) / 10, aws: Math.round(aws * 10) / 10 });
      });

      if (aPts.length < 2) return;

      const d = catmullRomPath(aPts);
      svg += `<path class="polar-curve polar-curve--apparent" d="${d}" stroke="${color}"/>`;

      aPts.forEach(p => {
        // no dots for apparent curves — tooltip snaps to true dots only
      });
    });
  }

  // Reference curves (grey overlay, filtered by visible TWS)
  if (state.ref) {
    const ref = state.ref;
    ref.tws.forEach((twsVal, ci) => {
      if (twsVal === 0 || !visibleTWSValues.has(twsVal)) return;
      const pts = [];
      ref.twa.forEach((angle, ri) => {
        const spd = ref.speeds[ri][ci];
        if (spd <= 0) return;
        const rad = angle * Math.PI / 180;
        const r = spd * scale;
        pts.push({ x: Math.sin(rad) * r, y: -Math.cos(rad) * r });
      });
      if (pts.length < 2) return;
      svg += `<path class="polar-curve polar-curve--ref" d="${catmullRomPath(pts)}"/>`;

      // Apparent curves for ref
      if (state.showApparent) {
        const aPts = [];
        ref.twa.forEach((angle, ri) => {
          const bs = ref.speeds[ri][ci];
          if (bs <= 0) return;
          const twaRad = angle * Math.PI / 180;
          const awx = twsVal * Math.sin(twaRad);
          const awy = twsVal * Math.cos(twaRad) + bs;
          const awa = Math.atan2(awx, awy);
          const r = bs * scale;
          aPts.push({ x: Math.sin(awa) * r, y: -Math.cos(awa) * r });
        });
        if (aPts.length >= 2) {
          svg += `<path class="polar-curve polar-curve--ref polar-curve--apparent" d="${catmullRomPath(aPts)}"/>`;
        }
      }
    });
  }

  // Center dot
  svg += '<circle cx="0" cy="0" r="2" fill="var(--accent)"/>';

  $chart.innerHTML = svg;
  bindTooltip();
}

function bindTooltip() {
  const $tooltip = document.getElementById('chart-tooltip');
  const $container = $chart.closest('.chart-container');
  const dots = Array.from($chart.querySelectorAll('.polar-dot'));
  let activeDot = null;

  // Cache dot data
  const dotData = dots.map(dot => ({
    el: dot,
    cx: parseFloat(dot.getAttribute('cx')),
    cy: parseFloat(dot.getAttribute('cy')),
    twa: dot.dataset.twa,
    tws: dot.dataset.tws,
    bs: dot.dataset.bs,
    awa: dot.dataset.awa,
    aws: dot.dataset.aws
  }));

  $chart.addEventListener('mousemove', (e) => {
    // Convert mouse position to SVG coordinates
    const pt = $chart.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform($chart.getScreenCTM().inverse());

    // Find nearest dot
    let best = null, bestDist = Infinity;
    for (const d of dotData) {
      const dx = d.cx - svgPt.x, dy = d.cy - svgPt.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = d; }
    }

    // Max snap distance (in SVG units)
    if (!best || bestDist > 900) { // ~30 SVG units
      if (activeDot) { activeDot.classList.remove('active'); activeDot = null; }
      $tooltip.hidden = true;
      return;
    }

    // Highlight dot
    if (activeDot && activeDot !== best.el) activeDot.classList.remove('active');
    best.el.classList.add('active');
    activeDot = best.el;

    // Position tooltip
    const screenPt = $chart.createSVGPoint();
    screenPt.x = best.cx; screenPt.y = best.cy;
    const pixel = screenPt.matrixTransform($chart.getScreenCTM());
    const rect = $container.getBoundingClientRect();

    const bs = parseFloat(best.bs).toFixed(1);
    let html = `TWA ${best.twa}°  ·  TWS ${best.tws} kn  ·  Bs ${bs} kn`;
    html += `<br><span class="tooltip-apparent">AWA ${best.awa}°  ·  AWS ${best.aws} kn</span>`;
    const refSpd = getRefSpeed(parseFloat(best.twa), parseFloat(best.tws));
    if (refSpd !== null) {
      const diff = parseFloat(best.bs) - refSpd;
      const arrow = diff > 0 ? '▴' : diff < 0 ? '▾' : '';
      const cls = diff > 0 ? 'tooltip-faster' : diff < 0 ? 'tooltip-slower' : '';
      html += `<br><span class="tooltip-ref">Réf: ${refSpd.toFixed(1)} kn`;
      if (Math.abs(diff) >= 0.05) html += ` <span class="${cls}">(${arrow}${Math.abs(diff).toFixed(1)})</span>`;
      html += '</span>';
    }
    $tooltip.innerHTML = html;
    $tooltip.style.left = (pixel.x - rect.left) + 'px';
    $tooltip.style.top = (pixel.y - rect.top) + 'px';
    $tooltip.hidden = false;
  });

  $chart.addEventListener('mouseleave', () => {
    if (activeDot) { activeDot.classList.remove('active'); activeDot = null; }
    $tooltip.hidden = true;
  });
}

// ── Zoom & Pan ──
const DEFAULT_VIEWBOX = { x: -40, y: -250, w: 290, h: 500 };
const viewBox = { ...DEFAULT_VIEWBOX };

function applyViewBox() {
  $chart.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

function initZoomPan() {
  let isPanning = false;
  let startPt = null;
  let startVB = null;

  // Wheel zoom — zoom toward cursor
  $chart.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

    // Cursor position in SVG coords
    const pt = $chart.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform($chart.getScreenCTM().inverse());

    // Zoom toward cursor
    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;

    // Clamp: don't zoom out beyond default
    if (newW > DEFAULT_VIEWBOX.w * 1.5 || newH > DEFAULT_VIEWBOX.h * 1.5) return;
    // Clamp: don't zoom in too much
    if (newW < 30 || newH < 50) return;

    viewBox.x = svgPt.x - (svgPt.x - viewBox.x) * factor;
    viewBox.y = svgPt.y - (svgPt.y - viewBox.y) * factor;
    viewBox.w = newW;
    viewBox.h = newH;
    applyViewBox();
  }, { passive: false });

  // Pan with middle-click or left-click drag
  $chart.addEventListener('mousedown', (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    isPanning = true;
    startPt = { x: e.clientX, y: e.clientY };
    startVB = { ...viewBox };
    $chart.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    // Convert pixel delta to SVG delta
    const ctm = $chart.getScreenCTM();
    const dx = (e.clientX - startPt.x) / ctm.a;
    const dy = (e.clientY - startPt.y) / ctm.d;
    viewBox.x = startVB.x - dx;
    viewBox.y = startVB.y - dy;
    applyViewBox();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      $chart.style.cursor = '';
    }
  });

  // Double-click to reset
  $chart.addEventListener('dblclick', (e) => {
    e.preventDefault();
    Object.assign(viewBox, { ...DEFAULT_VIEWBOX });
    applyViewBox();
  });
}

function niceStep(max) {
  if (max <= 5) return 1;
  if (max <= 12) return 2;
  if (max <= 20) return 5;
  return 5;
}

// ── Legend (interactive with checkboxes) ──
function renderLegend() {
  const { tws } = state;

  let html = '<div class="chart-legend__controls">';
  html += '<button class="btn btn--small" id="btn-tws-all">Tout</button>';
  html += '<button class="btn btn--small" id="btn-tws-none">Aucun</button>';
  const appChecked = state.showApparent ? 'checked' : '';
  html += `<label class="chart-legend__item chart-legend__item--apparent"><input type="checkbox" id="cb-apparent" ${appChecked} /><svg width="20" height="4" class="chart-legend__color--apparent"><line x1="0" y1="2" x2="20" y2="2" stroke="#777" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 4"/></svg>Apparent</label>`;
  html += '</div><div class="chart-legend__items">';

  tws.forEach((v, ci) => {
    if (v === 0) return;
    const color = COLORS[ci % COLORS.length];
    const checked = state.visibleTWS.has(ci) ? 'checked' : '';
    html += `<label class="chart-legend__item">
      <input type="checkbox" data-tws-ci="${ci}" ${checked} />
      <span class="chart-legend__color" style="background:${color}"></span>
      ${v} kn
    </label>`;
  });

  html += '</div>';
  if (state.ref) {
    html += `<div class="chart-legend__ref">Réf : ${state.ref.name}</div>`;
  }
  $legend.innerHTML = html;

  // Bind checkbox events
  $legend.querySelectorAll('input[data-tws-ci]').forEach(cb => {
    cb.addEventListener('change', () => {
      const ci = parseInt(cb.dataset.twsCi);
      if (cb.checked) {
        state.visibleTWS.add(ci);
      } else {
        state.visibleTWS.delete(ci);
      }
      renderChart();
      updateTableDimming();
    });
  });

  // Bind apparent toggle
  document.getElementById('cb-apparent').addEventListener('change', (e) => {
    state.showApparent = e.target.checked;
    renderChart();
  });

  // Bind select all / none
  document.getElementById('btn-tws-all').addEventListener('click', () => {
    state.tws.forEach((v, ci) => { if (v > 0) state.visibleTWS.add(ci); });
    renderChartAndLegend();
  });
  document.getElementById('btn-tws-none').addEventListener('click', () => {
    state.visibleTWS.clear();
    renderChartAndLegend();
  });
}

// ============================================================
// IMPORT
// ============================================================

function updateImportButton() {
  document.getElementById('btn-import').textContent = state.name;
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      parsePOL(evt.target.result);
      state.name = file.name.replace(/\.\w+$/, '');
      state.dirty = false;
      renderAll();
      updateImportButton();
      hideWarnings();
    } catch (err) {
      alert('Erreur de lecture : ' + err.message);
    }
  };
  reader.readAsText(file);
  // Reset so same file can be re-imported
  $fileInput.value = '';
}

function loadRefIndex() {
  fetch('polarlib/index.json')
    .then(r => r.json())
    .then(names => {
      names.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        $selectRef.appendChild(opt);
      });
      // Add "import file" option at the end
      const optFile = document.createElement('option');
      optFile.value = '__file__';
      optFile.textContent = '📂 Importer une ref…';
      $selectRef.appendChild(optFile);
    })
    .catch(() => {
      // Fallback: just keep the file import option
      const optFile = document.createElement('option');
      optFile.value = '__file__';
      optFile.textContent = '📂 Importer une ref…';
      $selectRef.appendChild(optFile);
    });
}

function handleRefSelect() {
  const val = $selectRef.value;

  if (val === '') {
    // "Comparer…" selected = clear ref
    state.ref = null;
    document.getElementById('ref-toggle').hidden = true;
    renderTable();
    renderChart();
    renderLegend();
    return;
  }

  if (val === '__file__') {
    $fileInputRef.click();
    // Reset select to current ref or empty
    $selectRef.value = state.ref ? '__custom__' : '';
    return;
  }

  // Load from polarlib
  fetch(`polarlib/${val}.pol`)
    .then(r => r.text())
    .then(text => {
      const data = parsePOLData(text);
      state.ref = { ...data, name: val };
      document.getElementById('ref-toggle').hidden = false;
      renderTable();
      renderChart();
      renderLegend();
    })
    .catch(err => alert('Erreur chargement ref : ' + err.message));
}

function handleImportRef(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = parsePOLData(evt.target.result);
      state.ref = { ...data, name: file.name.replace(/\.\w+$/, '') };
      $btnCompare.textContent = '✕ ' + state.ref.name;
      $btnCompare.classList.add('btn--ref-active');
      document.getElementById('ref-toggle').hidden = false;
      renderTable();
      renderChart();
      renderLegend();
    } catch (err) {
      alert('Erreur de lecture ref : ' + err.message);
    }
  };
  reader.readAsText(file);
  $fileInputRef.value = '';
}

function parsePOLData(text) {
  const lines = text.trim().replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('Fichier vide ou trop court');

  // Header
  const headerCells = lines[0].split('\t');
  if (!headerCells[0].includes('TWA') || !headerCells[0].includes('TWS')) {
    throw new Error('Header invalide (attendu: TWA\\TWS)');
  }

  const tws = headerCells.slice(1).map((v, i) => {
    const n = parseFloat(v.trim());
    if (isNaN(n)) throw new Error(`TWS invalide colonne ${i + 2}: "${v}"`);
    return n;
  });

  const twa = [];
  const speeds = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const angle = parseFloat(cells[0].trim());
    if (isNaN(angle)) throw new Error(`TWA invalide ligne ${i + 1}: "${cells[0]}"`);

    const row = cells.slice(1).map((v, j) => {
      const n = parseFloat(v.trim());
      if (isNaN(n)) throw new Error(`Vitesse invalide ligne ${i + 1}, colonne ${j + 2}: "${v}"`);
      return n;
    });

    // Pad or trim to match TWS count
    while (row.length < tws.length) row.push(0);
    if (row.length > tws.length) row.length = tws.length;

    twa.push(angle);
    speeds.push(row);
  }

  return { tws, twa, speeds };
}

function parsePOL(text) {
  const data = parsePOLData(text);
  state.tws = data.tws;
  state.twa = data.twa;
  state.speeds = data.speeds;
}

// ============================================================
// EXPORT
// ============================================================

function handleExport() {
  const warnings = validateNavimetrix();
  if (warnings.length > 0) {
    showWarnings(warnings);
  } else {
    hideWarnings();
  }

  const { tws, twa, speeds } = state;
  let content = 'TWA\\TWS';
  tws.forEach(v => { content += '\t' + v; });
  content += '\n';

  twa.forEach((angle, ri) => {
    content += angle;
    speeds[ri].forEach(spd => {
      content += '\t' + spd.toFixed(1);
    });
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'polaire.pol';
  a.click();
  URL.revokeObjectURL(url);

  state.dirty = false;
}

function validateNavimetrix() {
  const w = [];
  if (state.tws.length === 0 || state.tws[0] !== 0) {
    w.push('Il est recommande que la premiere valeur de TWS soit 0.');
  }
  if (state.tws.length === 0 || state.tws[state.tws.length - 1] < 40) {
    w.push('Il est recommande que la derniere valeur de TWS soit >= 40.');
  }
  if (state.twa.length === 0 || state.twa[0] !== 0) {
    w.push('Il est recommande que la premiere valeur de TWA soit 0.');
  }
  return w;
}

function showWarnings(list) {
  $warnings.innerHTML = '<strong>Avertissements Navimetrix :</strong><ul>' +
    list.map(w => `<li>${w}</li>`).join('') + '</ul>';
  $warnings.hidden = false;
}

function hideWarnings() {
  $warnings.hidden = true;
}
