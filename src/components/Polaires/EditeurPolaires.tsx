'use client';

import { useReducer, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { reducerEditeur, creerEtatInitial } from '@/lib/polaires/reducer';
import { parsePOL, exportPOL, validerNavimetrix } from '@/lib/polaires/parseur-pol';
import DiagrammePolaire from './DiagrammePolaire';
import LegendePolaire, { SidebarTWS } from './LegendePolaire';
import TableauPolaire from './TableauPolaire';

export default function EditeurPolaires() {
  const [state, dispatch] = useReducer(reducerEditeur, undefined, creerEtatInitial);
  const inputImport = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [listeRef, setListeRef] = useState<string[]>([]);

  // Avertissement avant fermeture si modifications non sauvegardees
  useEffect(() => {
    if (!state.dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.dirty]);

  // Charger l'index des polaires de reference
  useEffect(() => {
    fetch('/polarlib/index.json')
      .then(r => r.json())
      .then((noms: string[]) => setListeRef(noms))
      .catch(() => setListeRef([]));
  }, []);

  const donnees = useMemo(
    () => ({ tws: state.tws, twa: state.twa, speeds: state.speeds }),
    [state.tws, state.twa, state.speeds],
  );

  // Import polaire principale
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fichier = e.target.files?.[0];
      if (!fichier) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const contenu = evt.target?.result as string;
          const parsed = parsePOL(contenu);
          const nomFichier = fichier.name.replace(/\.\w+$/, '');
          dispatch({ type: 'CHARGER', donnees: parsed, nom: nomFichier });
        } catch (err) {
          alert('Erreur de lecture : ' + (err as Error).message);
        }
      };
      reader.readAsText(fichier);
      e.target.value = '';
    },
    [dispatch],
  );

  // Selection de reference
  const handleRefSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === '') {
        dispatch({ type: 'EFFACER_REF' });
        return;
      }
      if (val === '__file__') {
        inputRef.current?.click();
        e.target.value = state.ref ? '__custom__' : '';
        return;
      }
      fetch(`/polarlib/${val}.pol`)
        .then(r => r.text())
        .then(texte => {
          const parsed = parsePOL(texte);
          dispatch({ type: 'CHARGER_REF', ref: { ...parsed, nom: val } });
        })
        .catch(err => alert('Erreur chargement ref : ' + (err as Error).message));
    },
    [dispatch, state.ref],
  );

  // Import ref depuis fichier
  const handleImportRef = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fichier = e.target.files?.[0];
      if (!fichier) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const contenu = evt.target?.result as string;
          const parsed = parsePOL(contenu);
          const nomFichier = fichier.name.replace(/\.\w+$/, '');
          dispatch({ type: 'CHARGER_REF', ref: { ...parsed, nom: nomFichier } });
        } catch (err) {
          alert('Erreur de lecture ref : ' + (err as Error).message);
        }
      };
      reader.readAsText(fichier);
      e.target.value = '';
    },
    [dispatch],
  );

  // Export .pol
  const handleExport = useCallback(() => {
    const warns = validerNavimetrix(donnees);
    dispatch({ type: 'SET_AVERTISSEMENTS', liste: warns });
    const contenu = exportPOL(donnees);
    const blob = new Blob([contenu], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polaire.pol';
    a.click();
    URL.revokeObjectURL(url);
  }, [donnees, dispatch]);

  const handleAjouterTWA = useCallback(() => {
    const saisie = prompt('Angle TWA (0–180) :');
    if (saisie === null) return;
    const angle = Number(saisie);
    if (Number.isNaN(angle) || angle < 0 || angle > 180) {
      alert('Angle invalide (0–180)');
      return;
    }
    dispatch({ type: 'AJOUTER_TWA', angle });
  }, []);

  const handleAjouterTWS = useCallback(() => {
    const saisie = prompt('Vitesse TWS (≥ 0) :');
    if (saisie === null) return;
    const vitesse = Number(saisie);
    if (Number.isNaN(vitesse) || vitesse < 0) {
      alert('Vitesse invalide (≥ 0)');
      return;
    }
    dispatch({ type: 'AJOUTER_TWS', vitesse });
  }, []);

  // Handle resize chart/table
  const containerRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
    if (chartRef.current) chartRef.current.style.flexBasis = `${pct}%`;
    if (tableRef.current) tableRef.current.style.flexBasis = `${100 - pct}%`;
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <main className="polaires-editeur" ref={containerRef}>
      <section className="polaires-editeur__chart" ref={chartRef}>
        <div className="polaires-editeur__chart-row">
          <SidebarTWS
            tws={state.tws}
            visibleTWS={state.visibleTWS}
            montrerApparent={state.montrerApparent}
            dispatch={dispatch}
          />
          <DiagrammePolaire
            tws={state.tws}
            twa={state.twa}
            speeds={state.speeds}
            visibleTWS={state.visibleTWS}
            montrerApparent={state.montrerApparent}
            ref={state.ref}
          />
        </div>
        {state.ref && (
          <div className="polaires-legende__ref">
            Ref : {state.ref.nom}
          </div>
        )}
      </section>
      <div
        className="polaires-resize-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <section className="polaires-editeur__table" ref={tableRef}>
        {/* Pills au-dessus du tableau */}
        <div className="polaires-pills">
          <input ref={inputImport} type="file" accept=".pol,.csv,.txt" hidden onChange={handleImport} />
          <button className="polaires-pill" onClick={() => inputImport.current?.click()}>
            {state.nom}
          </button>

          <input ref={inputRef} type="file" accept=".pol,.csv,.txt" hidden onChange={handleImportRef} />
          <select className="polaires-pill polaires-pill--jaune polaires-pill--select" onChange={handleRefSelect} defaultValue="">
            <option value="">Comparer...</option>
            {listeRef.map(n => (
              <option key={n} value={n} style={{ fontWeight: 200 }}>{n}</option>
            ))}
            <option value="__file__">Importer une ref...</option>
          </select>

          <button className="polaires-pill" onClick={handleExport}>Exporter .pol</button>
        </div>

        {/* Avertissements */}
        {state.avertissements.length > 0 && (
          <div className="polaires-avertissements">
            <strong>Avertissements Navimetrix :</strong>
            <ul>
              {state.avertissements.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <TableauPolaire
          tws={state.tws}
          twa={state.twa}
          speeds={state.speeds}
          visibleTWS={state.visibleTWS}
          ref_polaire={state.ref}
          modeRef={state.modeRef}
          dispatch={dispatch}
        />
        <div className="polaires-table-actions">
          <button className="polaires-pill polaires-pill--small" onClick={handleAjouterTWA}>
            + Ligne TWA
          </button>
          <button className="polaires-pill polaires-pill--small" onClick={handleAjouterTWS}>
            + Colonne TWS
          </button>
          {state.ref && (
            <div className="polaires-ref-toggle">
              <button
                className={`polaires-ref-toggle__btn${state.modeRef === 'absolu' ? ' polaires-ref-toggle__btn--active' : ''}`}
                onClick={() => dispatch({ type: 'MODE_REF', mode: 'absolu' })}
              >
                Absolu
              </button>
              <button
                className={`polaires-ref-toggle__btn${state.modeRef === 'delta' ? ' polaires-ref-toggle__btn--active' : ''}`}
                onClick={() => dispatch({ type: 'MODE_REF', mode: 'delta' })}
              >
                &plusmn;&Delta;
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
