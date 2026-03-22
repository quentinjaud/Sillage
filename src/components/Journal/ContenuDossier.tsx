"use client";

import type {
  ContenuDossier as ContenuDossierType,
  ResumeAventure,
  ResumeNavigation,
} from "@/lib/types";
import CarteAventure from "./CarteAventure";
import CarteNavigation from "./CarteNavigation";

interface PropsContenuDossier {
  contenu: ContenuDossierType;
  dossierId: string;
  onAjouterAventure: (dossierId: string) => void;
  onAjouterNavigation: (aventureId: string | null) => void;
  onSurvolNavigation: (nav: ResumeNavigation | null) => void;
  onEditerAventure: (aventure: ResumeAventure) => void;
  onSupprimerAventure: (id: string) => void;
  onEditerNavigation: (nav: ResumeNavigation) => void;
  onSupprimerNavigation: (id: string) => void;
}

export default function ContenuDossier({
  contenu,
  dossierId,
  onAjouterAventure,
  onAjouterNavigation,
  onSurvolNavigation,
  onEditerAventure,
  onSupprimerAventure,
  onEditerNavigation,
  onSupprimerNavigation,
}: PropsContenuDossier) {
  const { aventures, navigationsOrphelines } = contenu;
  const estVide = aventures.length === 0 && navigationsOrphelines.length === 0;

  return (
    <div className="contenu-dossier">
      <div className="contenu-dossier-actions">
        <button
          className="btn-secondaire"
          onClick={() => onAjouterAventure(dossierId)}
        >
          + Aventure
        </button>
        <button
          className="btn-secondaire"
          onClick={() => onAjouterNavigation(null)}
        >
          + Navigation
        </button>
      </div>

      {estVide ? (
        <div className="contenu-dossier-vide">
          Aucune aventure ni navigation dans ce dossier
        </div>
      ) : (
        <>
          {aventures.map((aventure) => (
            <CarteAventure
              key={aventure.id}
              aventure={aventure}
              onSurvolNavigation={onSurvolNavigation}
              onEditerAventure={onEditerAventure}
              onSupprimerAventure={onSupprimerAventure}
              onEditerNavigation={onEditerNavigation}
              onSupprimerNavigation={onSupprimerNavigation}
              onAjouterNavigation={onAjouterNavigation}
            />
          ))}

          {navigationsOrphelines.length > 0 && aventures.length > 0 && (
            <div className="contenu-dossier-section-titre">Navigations</div>
          )}

          {navigationsOrphelines.map((nav) => (
            <CarteNavigation
              key={nav.id}
              navigation={nav}
              onSurvol={onSurvolNavigation}
              onEditer={onEditerNavigation}
              onSupprimer={onSupprimerNavigation}
            />
          ))}
        </>
      )}
    </div>
  );
}
