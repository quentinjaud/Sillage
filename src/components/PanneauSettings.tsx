"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DossierTableau {
  id: string;
  nom: string;
  parentId: string | null;
  nbNavigations: number;
  nbSousDossiers: number;
}

interface PropsPanneauSettings {
  ouvert: boolean;
  onFermer: () => void;
}

export default function PanneauSettings({ ouvert, onFermer }: PropsPanneauSettings) {
  const [dossiers, setDossiers] = useState<DossierTableau[]>([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setChargement(true);
    fetch("/api/journal/dossiers?tous=1")
      .then((r) => r.json())
      .then((data) => setDossiers(data))
      .catch(() => {})
      .finally(() => setChargement(false));
  }, [ouvert]);

  if (!ouvert) return null;

  // Build tree: root dossiers first, then children indented
  const racines = dossiers.filter((d) => !d.parentId);
  const enfantsDe = (parentId: string) =>
    dossiers.filter((d) => d.parentId === parentId);

  const lignes: { dossier: DossierTableau; niveau: number }[] = [];
  for (const racine of racines) {
    lignes.push({ dossier: racine, niveau: 0 });
    for (const enfant of enfantsDe(racine.id)) {
      lignes.push({ dossier: enfant, niveau: 1 });
    }
  }

  return (
    <div className="panneau-settings-overlay" onClick={onFermer}>
      <div className="panneau-settings" onClick={(e) => e.stopPropagation()}>
        <div className="panneau-settings-header">
          <h2 className="panneau-settings-titre">Parametres</h2>
          <button className="panneau-settings-fermer" onClick={onFermer}>
            ✕
          </button>
        </div>

        <div className="panneau-settings-onglets">
          <button className="panneau-settings-onglet panneau-settings-onglet-actif">
            Dossiers
          </button>
          <Link href="/bateaux" className="panneau-settings-onglet">
            Bateaux
          </Link>
          <Link href="/traces" className="panneau-settings-onglet">
            Traces
          </Link>
        </div>

        <div className="panneau-settings-contenu">
          {chargement ? (
            <p className="panneau-settings-chargement">Chargement...</p>
          ) : lignes.length === 0 ? (
            <p className="panneau-settings-vide">Aucun dossier</p>
          ) : (
            <table className="panneau-settings-tableau">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contenu</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ dossier, niveau }) => (
                  <tr key={dossier.id}>
                    <td>
                      <span style={{ paddingLeft: `${niveau * 20}px` }}>
                        {niveau > 0 && (
                          <span className="panneau-settings-indent">└ </span>
                        )}
                        {dossier.nom}
                      </span>
                    </td>
                    <td className="panneau-settings-contenu-cell">
                      {dossier.nbSousDossiers > 0 &&
                        `${dossier.nbSousDossiers} sous-dossiers`}
                      {dossier.nbSousDossiers > 0 && dossier.nbNavigations > 0 &&
                        " · "}
                      {dossier.nbNavigations > 0 &&
                        `${dossier.nbNavigations} nav${dossier.nbNavigations > 1 ? "s" : ""}`}
                      {dossier.nbSousDossiers === 0 &&
                        dossier.nbNavigations === 0 &&
                        "Vide"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
