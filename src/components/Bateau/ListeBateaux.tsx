"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Sailboat } from "lucide-react";
import type { ResumeBateau } from "@/lib/types";
import FormulaireBateau from "./FormulaireBateau";

interface Props {
  bateaux: ResumeBateau[];
}

export default function ListeBateaux({ bateaux: bateauxInitiaux }: Props) {
  const routeur = useRouter();
  const [bateauEnEdition, setBateauEnEdition] = useState<ResumeBateau | null>(null);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);

  async function supprimerBateau(id: string) {
    if (!confirm("Supprimer ce bateau ?")) return;

    const reponse = await fetch(`/api/bateaux/${id}`, { method: "DELETE" });
    if (reponse.ok) {
      routeur.refresh();
    }
  }

  function gererTermine() {
    setBateauEnEdition(null);
    setAfficherFormulaire(false);
    routeur.refresh();
  }

  if (afficherFormulaire || bateauEnEdition) {
    return (
      <FormulaireBateau
        bateau={bateauEnEdition ?? undefined}
        onTermine={gererTermine}
        onAnnuler={() => {
          setBateauEnEdition(null);
          setAfficherFormulaire(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="bateau-header">
        <h2 className="section-title">Mes bateaux</h2>
        <button
          className="bateau-add-btn"
          onClick={() => setAfficherFormulaire(true)}
        >
          Ajouter un bateau
        </button>
      </div>

      {bateauxInitiaux.length === 0 ? (
        <div className="trace-list-empty">
          <Sailboat className="trace-list-empty-icon" />
          <p>Aucun bateau enregistre</p>
        </div>
      ) : (
        <div className="bateau-list">
          {bateauxInitiaux.map((bateau) => (
            <div key={bateau.id} className="bateau-card">
              <div className="bateau-card-content">
                <div className="bateau-card-nom">{bateau.nom}</div>
                <div className="bateau-card-meta">
                  {bateau.classe && <span>{bateau.classe}</span>}
                  {bateau.longueur && <span>{bateau.longueur} m</span>}
                </div>
              </div>
              <div className="bateau-card-actions">
                <button
                  className="bateau-card-btn"
                  onClick={() => setBateauEnEdition(bateau)}
                  title="Modifier"
                >
                  <Pencil style={{ width: 16, height: 16 }} />
                </button>
                <button
                  className="bateau-card-btn danger"
                  onClick={() => supprimerBateau(bateau.id)}
                  title="Supprimer"
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
