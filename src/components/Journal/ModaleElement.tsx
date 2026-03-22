"use client";

import { useEffect, useState } from "react";
import { Modal, TextInput, Textarea, Select, NativeSelect } from "@mantine/core";
import type { ResumeTrace } from "@/lib/types";

interface PropsModaleElement {
  ouvert: boolean;
  onFermer: () => void;
  onValider: (donnees: Record<string, unknown>) => void;
  type: "dossier" | "aventure" | "navigation";
  edition?: Record<string, unknown> | null;
  dossierId?: string;
  aventureId?: string | null;
  tracesDisponibles?: ResumeTrace[];
}

const LABELS: Record<string, { nouveau: string; modifier: string }> = {
  dossier: { nouveau: "Nouveau dossier", modifier: "Modifier le dossier" },
  aventure: { nouveau: "Nouvelle aventure", modifier: "Modifier l\u2019aventure" },
  navigation: { nouveau: "Nouvelle navigation", modifier: "Modifier la navigation" },
};

export default function ModaleElement({
  ouvert,
  onFermer,
  onValider,
  type,
  edition,
  dossierId,
  aventureId,
  tracesDisponibles = [],
}: PropsModaleElement) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [typeNav, setTypeNav] = useState("SOLO");
  const [traceId, setTraceId] = useState<string | null>(null);

  useEffect(() => {
    if (ouvert) {
      setNom((edition?.nom as string) ?? "");
      setDescription((edition?.description as string) ?? "");
      setDate((edition?.date as string) ?? "");
      setTypeNav((edition?.type as string) ?? "SOLO");
      setTraceId((edition?.traceId as string) ?? null);
    }
  }, [ouvert, edition]);

  const estEdition = !!edition;
  const titre = estEdition
    ? LABELS[type].modifier
    : LABELS[type].nouveau;

  // Build trace options, prepending the currently linked trace if editing and not in available list
  const optionsTraces = tracesDisponibles.map((t) => ({
    value: t.id,
    label: `${t.name} (${t.filename})`,
  }));

  if (
    estEdition &&
    edition?.trace &&
    typeof edition.trace === "object" &&
    "id" in (edition.trace as Record<string, unknown>)
  ) {
    const traceEditee = edition.trace as { id: string; name: string };
    if (!optionsTraces.some((o) => o.value === traceEditee.id)) {
      optionsTraces.unshift({
        value: traceEditee.id,
        label: traceEditee.name,
      });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    if (type === "dossier") {
      onValider({ nom: nom.trim(), description: description.trim() || null });
    } else if (type === "aventure") {
      onValider({
        nom: nom.trim(),
        description: description.trim() || null,
        dossierId,
      });
    } else {
      onValider({
        nom: nom.trim(),
        date: date || null,
        type: typeNav,
        traceId: traceId || null,
        dossierId,
        aventureId: aventureId ?? null,
      });
    }
  };

  return (
    <Modal opened={ouvert} onClose={onFermer} title={titre} centered>
      <form onSubmit={handleSubmit} className="modale-form">
        <TextInput
          label="Nom"
          value={nom}
          onChange={(e) => setNom(e.currentTarget.value)}
          required
          autoFocus
        />

        {(type === "dossier" || type === "aventure") && (
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
        )}

        {type === "navigation" && (
          <>
            <TextInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
            <NativeSelect
              label="Type"
              value={typeNav}
              onChange={(e) => setTypeNav(e.currentTarget.value)}
              data={[
                { value: "SOLO", label: "Solo" },
                { value: "REGATE", label: "Régate" },
              ]}
            />
            <Select
              label="Trace"
              value={traceId}
              onChange={setTraceId}
              data={optionsTraces}
              clearable
              searchable
              placeholder="Aucune trace"
            />
          </>
        )}

        <div className="modale-form-actions">
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="btn-principal">
            {estEdition ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
