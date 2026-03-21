"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResumeUtilisateur } from "@/lib/types";
import SelectBateau from "@/components/SelectBateau";

interface BateauAdmin {
  id: string;
  nom: string;
  userId: string;
  user: { name: string };
}

interface TraceAdmin {
  id: string;
  name: string;
  createdAt: string;
  userId: string | null;
  user: { name: string } | null;
  bateauId: string | null;
  bateau: { id: string; nom: string } | null;
}

interface Props {
  traces: TraceAdmin[];
  utilisateurs: ResumeUtilisateur[];
  bateaux: BateauAdmin[];
}

export default function TransfertTrace({ traces, utilisateurs, bateaux }: Props) {
  const routeur = useRouter();
  const [traceSelectionnee, setTraceSelectionnee] = useState<string | null>(null);
  const [userDestination, setUserDestination] = useState("");
  const [chargement, setChargement] = useState(false);

  // Formater les bateaux pour le SelectBateau avec le nom du proprietaire
  const bateauxFormates = bateaux.map((b) => ({
    id: b.id,
    nom: `${b.nom} (${b.user.name})`,
    classe: null,
    longueur: null,
    createdAt: "",
  }));

  async function transferer() {
    if (!traceSelectionnee || !userDestination) return;
    setChargement(true);

    try {
      const reponse = await fetch(
        `/api/admin/traces/${traceSelectionnee}/transferer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userDestination }),
        }
      );

      if (reponse.ok) {
        setTraceSelectionnee(null);
        setUserDestination("");
        routeur.refresh();
      } else {
        const data = await reponse.json();
        alert(data.error || "Erreur lors du transfert");
      }
    } catch {
      alert("Erreur lors du transfert");
    } finally {
      setChargement(false);
    }
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Proprietaire</th>
          <th>Bateau</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {traces.map((trace) => (
          <tr key={trace.id}>
            <td>{trace.name}</td>
            <td>
              {trace.user ? (
                trace.user.name
              ) : (
                <span className="admin-badge admin-badge-orpheline">
                  orpheline
                </span>
              )}
            </td>
            <td>
              <SelectBateau
                traceId={trace.id}
                bateauId={trace.bateauId}
                bateaux={bateauxFormates}
                apiBase="/api/admin/traces"
              />
            </td>
            <td>{new Date(trace.createdAt).toLocaleDateString("fr-FR")}</td>
            <td>
              {traceSelectionnee === trace.id ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="admin-transfert-select"
                    value={userDestination}
                    onChange={(e) => setUserDestination(e.target.value)}
                  >
                    <option value="">Choisir un utilisateur</option>
                    {utilisateurs.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <button
                    className="admin-actions-btn"
                    onClick={transferer}
                    disabled={!userDestination || chargement}
                  >
                    {chargement ? "..." : "OK"}
                  </button>
                  <button
                    className="admin-actions-btn"
                    onClick={() => setTraceSelectionnee(null)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  className="admin-actions-btn"
                  onClick={() => setTraceSelectionnee(trace.id)}
                >
                  Transferer
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
