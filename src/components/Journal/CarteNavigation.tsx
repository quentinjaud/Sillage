"use client";

import { useRouter } from "next/navigation";
import type { ResumeNavigation } from "@/lib/types";

interface PropsCarteNavigation {
  navigation: ResumeNavigation;
  onSurvol: (nav: ResumeNavigation | null) => void;
  onEditer: (nav: ResumeNavigation) => void;
  onSupprimer: (id: string) => void;
}

export default function CarteNavigation({
  navigation,
  onSurvol,
  onEditer,
  onSupprimer,
}: PropsCarteNavigation) {
  const routeur = useRouter();
  const dateFormatee = navigation.date
    ? new Date(navigation.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const distanceTrace = navigation.trace?.distanceNm
    ? `${navigation.trace.distanceNm.toFixed(1)} NM`
    : null;

  return (
    <div
      className={`carte-navigation ${navigation.trace ? "carte-navigation-cliquable" : ""}`}
      onMouseEnter={() => onSurvol(navigation)}
      onMouseLeave={() => onSurvol(null)}
      onClick={() => {
        if (navigation.trace) routeur.push(`/trace/${navigation.trace.id}`);
      }}
    >
      <div className="carte-navigation-contenu">
        <div className="carte-navigation-header">
          <span className="carte-navigation-nom">{navigation.nom}</span>
          {dateFormatee && (
            <span className="carte-navigation-date">{dateFormatee}</span>
          )}
        </div>
        <div className="carte-navigation-badges">
          <span
            className={`badge-type ${
              navigation.type === "REGATE"
                ? "badge-type-regate"
                : "badge-type-solo"
            }`}
          >
            {navigation.type === "REGATE" ? "Régate" : "Solo"}
          </span>
          {navigation.trace?.bateau && (
            <span className="badge-bateau">
              {navigation.trace.bateau.nom}
            </span>
          )}
          {navigation.trace ? (
            <span className="badge-trace">{distanceTrace}</span>
          ) : (
            <span className="badge-trace-vide">Aucune trace</span>
          )}
        </div>
      </div>
      <div className="carte-navigation-actions">
        <button
          className="btn-menu-contextuel"
          onClick={(e) => {
            e.stopPropagation();
            onEditer(navigation);
          }}
          title="Modifier"
        >
          ✎
        </button>
        <button
          className="btn-menu-contextuel btn-menu-contextuel-danger"
          onClick={(e) => {
            e.stopPropagation();
            onSupprimer(navigation.id);
          }}
          title="Supprimer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
