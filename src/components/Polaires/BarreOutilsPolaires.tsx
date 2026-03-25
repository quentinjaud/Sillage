'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ActionEditeur, PolaireReference, DonneesPolaire } from '@/lib/polaires/types';
import { parsePOL, exportPOL, validerNavimetrix } from '@/lib/polaires/parseur-pol';

interface PropsBarreOutils {
  nom: string;
  refPolaire: PolaireReference | null;
  avertissements: string[];
  donnees: DonneesPolaire;
  dispatch: React.Dispatch<ActionEditeur>;
}

export default function BarreOutilsPolaires({
  nom,
  refPolaire,
  avertissements,
  donnees,
  dispatch,
}: PropsBarreOutils) {
  const inputImport = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [listeRef, setListeRef] = useState<string[]>([]);

  // Charger l'index des polaires de reference
  useEffect(() => {
    fetch('/polarlib/index.json')
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
      fetch(`/polarlib/${val}.pol`)
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
