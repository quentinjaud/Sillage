"use client";

import { useRouter } from "next/navigation";
import type { ResumeUtilisateur } from "@/lib/types";

interface Props {
  utilisateurs: ResumeUtilisateur[];
  utilisateurConnecteId: string;
}

export default function TableauUtilisateurs({ utilisateurs, utilisateurConnecteId }: Props) {
  const routeur = useRouter();

  async function supprimerUtilisateur(id: string, nom: string) {
    if (
      !confirm(
        `Supprimer l'utilisateur "${nom}" ? Ses traces deviendront orphelines.`
      )
    ) {
      return;
    }

    const reponse = await fetch(`/api/admin/utilisateurs/${id}`, {
      method: "DELETE",
    });

    if (reponse.ok) {
      routeur.refresh();
    } else {
      const data = await reponse.json();
      alert(data.error || "Erreur lors de la suppression");
    }
  }

  if (utilisateurs.length === 0) {
    return <p>Aucun utilisateur</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Email</th>
          <th>Role</th>
          <th>Traces</th>
          <th>Bateaux</th>
          <th>Inscription</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {utilisateurs.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>
              <span
                className={`admin-badge ${u.role === "admin" ? "admin-badge-admin" : "admin-badge-user"}`}
              >
                {u.role}
              </span>
            </td>
            <td>{u._count.traces}</td>
            <td>{u._count.bateaux}</td>
            <td>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
            <td>
              {u.id !== utilisateurConnecteId && (
                <button
                  className="admin-actions-btn danger"
                  onClick={() => supprimerUtilisateur(u.id, u.name)}
                >
                  Supprimer
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
