"use client";

import { useState } from "react";
import type { ResumeBateau } from "@/lib/types";

interface Props {
  bateau?: ResumeBateau;
  onTermine: () => void;
  onAnnuler: () => void;
}

export default function FormulaireBateau({ bateau, onTermine, onAnnuler }: Props) {
  const [nom, setNom] = useState(bateau?.nom ?? "");
  const [type, setType] = useState(bateau?.type ?? "");
  const [classe, setClasse] = useState(bateau?.classe ?? "");
  const [longueur, setLongueur] = useState(bateau?.longueur?.toString() ?? "");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const estEdition = !!bateau;

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const url = estEdition ? `/api/bateaux/${bateau.id}` : "/api/bateaux";
      const methode = estEdition ? "PUT" : "POST";

      const reponse = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          type: type || null,
          classe: classe || null,
          longueur: longueur ? parseFloat(longueur) : null,
        }),
      });

      if (!reponse.ok) {
        const data = await reponse.json();
        throw new Error(data.error || "Erreur");
      }

      onTermine();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur");
      setChargement(false);
    }
  }

  return (
    <form onSubmit={gererSoumission} className="bateau-form">
      <h3 className="bateau-form-title">
        {estEdition ? "Modifier le bateau" : "Ajouter un bateau"}
      </h3>

      {erreur && <div className="auth-error">{erreur}</div>}

      <div className="bateau-form-field">
        <label htmlFor="nom" className="bateau-form-label">
          Nom *
        </label>
        <input
          id="nom"
          type="text"
          className="bateau-form-input"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          placeholder="Ex: Origami"
        />
      </div>

      <div className="bateau-form-field">
        <label htmlFor="type" className="bateau-form-label">
          Type
        </label>
        <input
          id="type"
          type="text"
          className="bateau-form-input"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Ex: Voilier, Deriveur, Catamaran"
        />
      </div>

      <div className="bateau-form-field">
        <label htmlFor="classe" className="bateau-form-label">
          Classe
        </label>
        <input
          id="classe"
          type="text"
          className="bateau-form-input"
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          placeholder="Ex: J/80, Figaro 3, Mini 6.50"
        />
      </div>

      <div className="bateau-form-field">
        <label htmlFor="longueur" className="bateau-form-label">
          Longueur (m)
        </label>
        <input
          id="longueur"
          type="number"
          className="bateau-form-input"
          value={longueur}
          onChange={(e) => setLongueur(e.target.value)}
          step="0.01"
          min="0"
          placeholder="Ex: 8.00"
        />
      </div>

      <div className="bateau-form-actions">
        <button
          type="submit"
          className="bateau-form-submit"
          disabled={chargement}
        >
          {chargement
            ? "Enregistrement..."
            : estEdition
              ? "Modifier"
              : "Ajouter"}
        </button>
        <button
          type="button"
          className="bateau-form-cancel"
          onClick={onAnnuler}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
