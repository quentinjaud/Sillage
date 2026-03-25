'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ActionEditeur, PolaireReference, DonneesPolaire } from '@/lib/polaires/types';
import { parsePOL, exportPOL, validerNavimetrix } from '@/lib/polaires/parseur-pol';

interface PropsBarreOutils {
  nom: string;
  refPolaire: PolaireReference | null;
  modeRef: 'absolu' | 'delta';
  avertissements: string[];
  donnees: DonneesPolaire;
  dispatch: React.Dispatch<ActionEditeur>;
}

export default function BarreOutilsPolaires({
  nom,
  refPolaire,
  modeRef,
  avertissements,
  donnees,
  dispatch,
}: PropsBarreOutils) {
  const inputImport = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [listeRef, setListeRef] = useState<string[]>([]);

  // Charger l'index des polaires de reference
  useEffect(() => {
    fetch('/polaires/polarlib/index.json')
      .then(r => r.json())
      .then((noms: string[]) => setListeRef(noms))
      .catch(() => setListeRef([]));
  }, []);

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

  // Selection de reference depuis le select
  const handleRefSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;

      if (val === '') {
        dispatch({ type: 'EFFACER_REF' });
        return;
      }

      if (val === '__file__') {
        inputRef.current?.click();
        e.target.value = refPolaire ? '__custom__' : '';
        return;
      }

      // Charger depuis la bibliotheque
      fetch(`/polaires/polarlib/${val}.pol`)
        .then(r => r.text())
        .then(texte => {
          const parsed = parsePOL(texte);
          dispatch({
            type: 'CHARGER_REF',
            ref: { ...parsed, nom: val },
          });
        })
        .catch(err => alert('Erreur chargement ref : ' + (err as Error).message));
    },
    [dispatch, refPolaire],
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
          dispatch({
            type: 'CHARGER_REF',
            ref: { ...parsed, nom: nomFichier },
          });
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

  return (
    <>
      <div className="polaires-toolbar">
        <div className="polaires-toolbar__left">
          <a href="/journal" className="polaires-toolbar__back" title="Retour">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="sq-polaires" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#43728B" />
                  <stop offset="20%" stopColor="#43728B" />
                  <stop offset="50%" stopColor="#D32F2F" />
                  <stop offset="80%" stopColor="#F6BC00" />
                  <stop offset="100%" stopColor="#F6BC00" />
                </linearGradient>
              </defs>
              <path
                d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2"
                stroke="url(#sq-polaires)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <span className="polaires-toolbar__title">Editeur de polaires</span>
        </div>

        <div className="polaires-toolbar__actions">
          {/* Import */}
          <input
            ref={inputImport}
            type="file"
            accept=".pol,.csv,.txt"
            hidden
            onChange={handleImport}
          />
          <button
            className="polaires-btn polaires-btn--primary"
            onClick={() => inputImport.current?.click()}
          >
            {nom}
          </button>

          {/* Reference select */}
          <input
            ref={inputRef}
            type="file"
            accept=".pol,.csv,.txt"
            hidden
            onChange={handleImportRef}
          />
          <select
            className="polaires-select-ref"
            onChange={handleRefSelect}
            defaultValue=""
          >
            <option value="">Comparer...</option>
            {listeRef.map(n => (
              <option key={n} value={n} style={{ fontWeight: 200 }}>
                {n}
              </option>
            ))}
            <option value="__file__">Importer une ref...</option>
          </select>

          {/* Export */}
          <button
            className="polaires-btn polaires-btn--secondary"
            onClick={handleExport}
          >
            Exporter .pol
          </button>

          {/* Toggle absolu / delta */}
          {refPolaire && (
            <div className="polaires-ref-toggle">
              <button
                className={`polaires-ref-toggle__btn${modeRef === 'absolu' ? ' polaires-ref-toggle__btn--active' : ''}`}
                onClick={() => dispatch({ type: 'MODE_REF', mode: 'absolu' })}
              >
                Absolu
              </button>
              <button
                className={`polaires-ref-toggle__btn${modeRef === 'delta' ? ' polaires-ref-toggle__btn--active' : ''}`}
                onClick={() => dispatch({ type: 'MODE_REF', mode: 'delta' })}
              >
                &plusmn;&Delta;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barre d'avertissements */}
      {avertissements.length > 0 && (
        <div className="polaires-avertissements">
          <strong>Avertissements Navimetrix :</strong>
          <ul>
            {avertissements.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
