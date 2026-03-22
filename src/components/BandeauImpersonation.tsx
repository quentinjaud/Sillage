"use client";

import { useState, useEffect } from "react";

function lireCookie(nom: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function BandeauImpersonation() {
  const [nomCible, setNomCible] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    const valeur = lireCookie("sillage-impersonate");
    if (valeur) {
      // Format: "userId:nom"
      const nom = valeur.split(":").slice(1).join(":");
      setNomCible(nom || "Utilisateur");
    }
  }, []);

  if (!nomCible) return null;

  async function quitterImpersonation() {
    setChargement(true);
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/traces";
  }

  return (
    <div className="bandeau-impersonation">
      <span>
        Vous voyez l&apos;app en tant que <strong>{nomCible}</strong>
      </span>
      <button
        className="bandeau-impersonation-btn"
        onClick={quitterImpersonation}
        disabled={chargement}
      >
        {chargement ? "..." : "Quitter"}
      </button>
    </div>
  );
}
