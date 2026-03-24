"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface PropsPanneauFlottant {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
  largeur?: number;
}

export default function PanneauFlottant({
  titre,
  onFermer,
  children,
  largeur = 340,
}: PropsPanneauFlottant) {
  return (
    <div className="panneau-flottant" style={{ width: largeur }}>
      <div className="panneau-flottant-header">
        <h3 className="panneau-flottant-titre">{titre}</h3>
        <button
          className="panneau-flottant-fermer"
          onClick={onFermer}
          title="Fermer"
          aria-label="Fermer le panneau"
        >
          <X size={16} />
        </button>
      </div>
      <div className="panneau-flottant-contenu">
        {children}
      </div>
    </div>
  );
}
