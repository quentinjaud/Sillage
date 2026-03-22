"use client";

import { useState } from "react";
import type { ResumeAventure, ResumeNavigation } from "@/lib/types";
import CarteNavigation from "./CarteNavigation";

interface PropsCarteAventure {
  aventure: ResumeAventure;
  onSurvolNavigation: (nav: ResumeNavigation | null) => void;
  onEditerAventure: (aventure: ResumeAventure) => void;
  onSupprimerAventure: (id: string) => void;
  onEditerNavigation: (nav: ResumeNavigation) => void;
  onSupprimerNavigation: (id: string) => void;
  onAjouterNavigation: (aventureId: string) => void;
}

export default function CarteAventure({
  aventure,
  onSurvolNavigation,
  onEditerAventure,
  onSupprimerAventure,
  onEditerNavigation,
  onSupprimerNavigation,
  onAjouterNavigation,
}: PropsCarteAventure) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="carte-aventure">
      <div
        className="carte-aventure-header"
        onClick={() => setOuvert(!ouvert)}
      >
        <div className="carte-aventure-info">
          <span className="carte-aventure-chevron">
            {ouvert ? "▾" : "▸"}
          </span>
          <span className="carte-aventure-nom">{aventure.nom}</span>
          <span className="carte-aventure-count">
            {aventure.navigations.length} navigation
            {aventure.navigations.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="carte-aventure-actions">
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onAjouterNavigation(aventure.id);
            }}
            title="Ajouter une navigation"
          >
            +
          </button>
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onEditerAventure(aventure);
            }}
            title="Modifier"
          >
            ✎
          </button>
          <button
            className="btn-menu-contextuel btn-menu-contextuel-danger"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimerAventure(aventure.id);
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
      {ouvert && (
        <div className="carte-aventure-contenu">
          {aventure.navigations.length === 0 ? (
            <div className="carte-aventure-vide">Aucune navigation</div>
          ) : (
            aventure.navigations.map((nav) => (
              <CarteNavigation
                key={nav.id}
                navigation={nav}
                onSurvol={onSurvolNavigation}
                onEditer={onEditerNavigation}
                onSupprimer={onSupprimerNavigation}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
