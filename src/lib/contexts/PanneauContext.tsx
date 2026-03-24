"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type TypePanneau = "traces" | "bateaux" | "preferences" | null;

interface ContextePanneau {
  panneauOuvert: TypePanneau;
  ouvrirPanneau: (type: TypePanneau) => void;
  fermerPanneau: () => void;
  /** Mode port d'attache : clic sur la carte pour definir la position */
  modePortAttache: boolean;
  setModePortAttache: (actif: boolean) => void;
}

const PanneauContext = createContext<ContextePanneau>({
  panneauOuvert: null,
  ouvrirPanneau: () => {},
  fermerPanneau: () => {},
  modePortAttache: false,
  setModePortAttache: () => {},
});

export function PanneauProvider({ children }: { children: ReactNode }) {
  const [panneauOuvert, setPanneauOuvert] = useState<TypePanneau>(null);
  const [modePortAttache, setModePortAttache] = useState(false);

  const ouvrirPanneau = useCallback((type: TypePanneau) => {
    setPanneauOuvert((actuel) => (actuel === type ? null : type));
  }, []);

  const fermerPanneau = useCallback(() => {
    setPanneauOuvert(null);
  }, []);

  return (
    <PanneauContext.Provider
      value={{ panneauOuvert, ouvrirPanneau, fermerPanneau, modePortAttache, setModePortAttache }}
    >
      {children}
    </PanneauContext.Provider>
  );
}

export function usePanneau() {
  return useContext(PanneauContext);
}
