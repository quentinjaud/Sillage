"use client";

import type { ReactNode } from "react";
import type { ResumeDossier } from "@/lib/types";

interface PropsCarteDossier {
  dossier: ResumeDossier;
  ouvert: boolean;
  onToggle: () => void;
  onEditer: (dossier: ResumeDossier) => void;
  onSupprimer: (id: string) => void;
  children: ReactNode;
}

export default function CarteDossier({
  dossier,
  ouvert,
  onToggle,
  onEditer,
  onSupprimer,
  children,
}: PropsCarteDossier) {
  const compteurs =
    dossier.nbAventures === 0 && dossier.nbNavigations === 0
      ? "Vide"
      : [
          dossier.nbAventures > 0
            ? `${dossier.nbAventures} aventure${dossier.nbAventures > 1 ? "s" : ""}`
            : null,
          dossier.nbNavigations > 0
            ? `${dossier.nbNavigations} navigation${dossier.nbNavigations > 1 ? "s" : ""}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="carte-dossier">
      <div className="carte-dossier-header" onClick={onToggle}>
        <div className="carte-dossier-info">
          <span className="carte-dossier-chevron">
            {ouvert ? "▾" : "▸"}
          </span>
          <div>
            <h3 className="carte-dossier-nom">{dossier.nom}</h3>
            {dossier.description && (
              <div className="carte-dossier-description">
                {dossier.description}
              </div>
            )}
            <span className="carte-dossier-compteurs">{compteurs}</span>
          </div>
        </div>
        <div className="carte-dossier-actions">
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onEditer(dossier);
            }}
            title="Modifier"
          >
            ✎
          </button>
          <button
            className="btn-menu-contextuel btn-menu-contextuel-danger"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimer(dossier.id);
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
      {ouvert && (
        <div className="carte-dossier-contenu">{children}</div>
      )}
    </div>
  );
}
