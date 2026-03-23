"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileText, Search, Eraser } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import type { ResumeTrace, ResumeBateau } from "@/lib/types";
import { formaterDuree } from "@/lib/utilitaires";
import SelectBateau from "@/components/SelectBateau";

interface PropsListeTraces {
  traces: ResumeTrace[];
  bateaux?: ResumeBateau[];
}

type TriColonne = "date" | "distance" | "vitesse";
type TriOrdre = "asc" | "desc";

export default function TraceList({ traces, bateaux = [] }: PropsListeTraces) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [filtreBateau, setFiltreBateau] = useState<string>("tous");
  const [triPar, setTriPar] = useState<TriColonne>("date");
  const [triOrdre, setTriOrdre] = useState<TriOrdre>("desc");

  const tracesFiltrees = useMemo(() => {
    let resultat = [...traces];

    // Filtre texte
    if (recherche) {
      const terme = recherche.toLowerCase();
      resultat = resultat.filter((t) =>
        t.name.toLowerCase().includes(terme)
      );
    }

    // Filtre bateau
    if (filtreBateau === "aucun") {
      resultat = resultat.filter((t) => !t.bateauId);
    } else if (filtreBateau !== "tous") {
      resultat = resultat.filter((t) => t.bateauId === filtreBateau);
    }

    // Tri
    resultat.sort((a, b) => {
      let diff = 0;
      switch (triPar) {
        case "date":
          diff =
            new Date(a.startedAt ?? a.createdAt).getTime() -
            new Date(b.startedAt ?? b.createdAt).getTime();
          break;
        case "distance":
          diff = (a.distanceNm ?? 0) - (b.distanceNm ?? 0);
          break;
        case "vitesse":
          diff = (a.avgSpeedKn ?? 0) - (b.avgSpeedKn ?? 0);
          break;
      }
      return triOrdre === "asc" ? diff : -diff;
    });

    return resultat;
  }, [traces, recherche, filtreBateau, triPar, triOrdre]);

  const basculerTri = (colonne: TriColonne) => {
    if (triPar === colonne) {
      setTriOrdre((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setTriPar(colonne);
      setTriOrdre("desc");
    }
  };

  if (traces.length === 0) {
    return (
      <div className="trace-list-empty">
        <FileText className="trace-list-empty-icon" />
        <p>Aucune trace importée</p>
        <p style={{ fontSize: "0.875rem" }}>
          Importez un fichier GPX ou KML pour commencer
        </p>
      </div>
    );
  }

  const gererSuppression = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette trace ?")) return;

    await fetch(`/api/traces/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      {/* Barre de filtres */}
      <div className="trace-filters">
        <div className="trace-filter-search">
          <Search style={{ width: 14, height: 14 }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="trace-filter-input"
          />
        </div>

        {bateaux.length > 0 && (
          <select
            value={filtreBateau}
            onChange={(e) => setFiltreBateau(e.target.value)}
            className="trace-filter-select"
          >
            <option value="tous">Tous les bateaux</option>
            <option value="aucun">Sans bateau</option>
            {bateaux.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </select>
        )}

        <div className="trace-filter-tri">
          {(["date", "distance", "vitesse"] as TriColonne[]).map((col) => (
            <button
              key={col}
              onClick={() => basculerTri(col)}
              className={`trace-filter-tri-btn${triPar === col ? " active" : ""}`}
            >
              {col === "date" ? "Date" : col === "distance" ? "Distance" : "Vitesse"}
              {triPar === col && (triOrdre === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
      </div>

      {/* Liste filtrée */}
      <div className="trace-list">
        {tracesFiltrees.length === 0 ? (
          <p className="trace-list-no-results">Aucun résultat</p>
        ) : (
          tracesFiltrees.map((trace) => (
            <div
              key={trace.id}
              onClick={() => router.push(`/trace/${trace.id}`)}
              className="trace-list-item"
            >
              <div className="trace-list-item-content">
                <h3 className="trace-list-item-name">{trace.name}</h3>
                <div className="trace-list-item-meta">
                  <span>
                    {trace.startedAt
                      ? format(
                          new Date(trace.startedAt),
                          "d MMM yyyy 'à' HH'h'mm",
                          { locale: fr }
                        )
                      : format(new Date(trace.createdAt), "d MMM yyyy", {
                          locale: fr,
                        })}
                  </span>
                  {trace.distanceNm && (
                    <span>{trace.distanceNm.toFixed(1)} NM</span>
                  )}
                  {trace.durationSeconds && (
                    <span>{formaterDuree(trace.durationSeconds)}</span>
                  )}
                  {trace.avgSpeedKn && (
                    <span>{trace.avgSpeedKn.toFixed(1)} kt moy.</span>
                  )}
                </div>
              </div>
              <div className="trace-list-item-actions">
                {bateaux.length > 0 && (
                  <SelectBateau
                    traceId={trace.id}
                    bateauId={trace.bateauId}
                    bateaux={bateaux}
                  />
                )}
                <Link
                  href={`/trace/${trace.id}/nettoyage`}
                  onClick={(e) => e.stopPropagation()}
                  className="trace-list-clean-btn"
                  title="Nettoyer"
                >
                  <Eraser style={{ width: 14, height: 14 }} />
                </Link>
                <span className="trace-badge">{trace.format}</span>
                <button
                  onClick={(e) => gererSuppression(trace.id, e)}
                  className="trace-list-delete-btn"
                  title="Supprimer"
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
