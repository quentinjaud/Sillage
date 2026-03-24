"use client";

import { usePanneau } from "@/lib/contexts/PanneauContext";
import PanneauFlottant from "@/components/PanneauFlottant";
import ContenuTraces from "./ContenuTraces";
import ContenuBateaux from "./ContenuBateaux";

export default function PanneauFlottantRendu() {
  const { panneauOuvert, fermerPanneau } = usePanneau();

  if (!panneauOuvert) return null;

  const config = {
    traces: { titre: "Mes traces", largeur: 400, contenu: <ContenuTraces /> },
    bateaux: { titre: "Mes bateaux", largeur: 340, contenu: <ContenuBateaux /> },
    preferences: { titre: "Preferences", largeur: 340, contenu: <div>TODO: preferences</div> },
  } as const;

  const panneau = config[panneauOuvert];
  if (!panneau) return null;

  return (
    <div className="panneaux-flottants-droite">
      <PanneauFlottant
        titre={panneau.titre}
        onFermer={fermerPanneau}
        largeur={panneau.largeur}
      >
        {panneau.contenu}
      </PanneauFlottant>
    </div>
  );
}
