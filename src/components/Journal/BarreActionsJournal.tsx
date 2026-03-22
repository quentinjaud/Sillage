"use client";

import { NativeSelect } from "@mantine/core";
import type { ResumeBateau } from "@/lib/types";

interface PropsBarreActionsJournal {
  onNouveauDossier: () => void;
  bateaux: ResumeBateau[];
  filtreBateau: string;
  onFiltreBateau: (value: string) => void;
  filtreType: string;
  onFiltreType: (value: string) => void;
}

export default function BarreActionsJournal({
  onNouveauDossier,
  bateaux,
  filtreBateau,
  onFiltreBateau,
  filtreType,
  onFiltreType,
}: PropsBarreActionsJournal) {
  const optionsBateaux = [
    { value: "", label: "Tous les bateaux" },
    ...bateaux.map((b) => ({ value: b.id, label: b.nom })),
  ];

  const optionsType = [
    { value: "", label: "Tous les types" },
    { value: "SOLO", label: "Solo" },
    { value: "REGATE", label: "Régate" },
  ];

  return (
    <div className="barre-actions-journal">
      <button className="btn-principal" onClick={onNouveauDossier}>
        + Nouveau dossier
      </button>
      <div className="barre-actions-filtres">
        <NativeSelect
          size="xs"
          value={filtreBateau}
          onChange={(e) => onFiltreBateau(e.currentTarget.value)}
          data={optionsBateaux}
        />
        <NativeSelect
          size="xs"
          value={filtreType}
          onChange={(e) => onFiltreType(e.currentTarget.value)}
          data={optionsType}
        />
      </div>
    </div>
  );
}
