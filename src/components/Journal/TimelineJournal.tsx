"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2, MapPin } from "lucide-react";
import FormulaireEntree from "./FormulaireEntree";

export interface EntreeJournalClient {
  id: string;
  timestamp: string;
  lat: number | null;
  lon: number | null;
  texte: string;
}

interface PropsTimelineJournal {
  navigationId: string;
  /** Callback quand on clique une entree — saute au point GPS */
  onClickEntree?: (timestamp: string, lat: number | null, lon: number | null) => void;
  /** Point actif pour pre-remplir le formulaire */
  pointActifTimestamp?: string | null;
  pointActifLat?: number | null;
  pointActifLon?: number | null;
}

export default function TimelineJournal({
  navigationId,
  onClickEntree,
  pointActifTimestamp,
  pointActifLat,
  pointActifLon,
}: PropsTimelineJournal) {
  const [entrees, setEntrees] = useState<EntreeJournalClient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [entreeSelectionnee, setEntreeSelectionnee] = useState<string | null>(null);
  const [modeAjout, setModeAjout] = useState(false);

  const charger = useCallback(async () => {
    try {
      const rep = await fetch(`/api/journal/navigations/${navigationId}/entrees`);
      if (rep.ok) setEntrees(await rep.json());
    } catch {
      // silencieux
    } finally {
      setChargement(false);
    }
  }, [navigationId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleAjout = useCallback(
    async (texte: string) => {
      const rep = await fetch(`/api/journal/navigations/${navigationId}/entrees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: pointActifTimestamp ?? new Date().toISOString(),
          lat: pointActifLat,
          lon: pointActifLon,
          texte,
        }),
      });
      if (rep.ok) {
        const nouvelle = await rep.json();
        setEntrees((prev) => [...prev, nouvelle].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
        setModeAjout(false);
        setEntreeSelectionnee(nouvelle.id);
      }
    },
    [navigationId, pointActifTimestamp, pointActifLat, pointActifLon]
  );

  const handleSuppression = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer cette entree ?")) return;
      const rep = await fetch(`/api/journal/entrees/${id}`, { method: "DELETE" });
      if (rep.ok) {
        setEntrees((prev) => prev.filter((e) => e.id !== id));
        if (entreeSelectionnee === id) setEntreeSelectionnee(null);
      }
    },
    [entreeSelectionnee]
  );

  const handleClickDot = useCallback(
    (entree: EntreeJournalClient) => {
      setEntreeSelectionnee(entree.id);
      onClickEntree?.(entree.timestamp, entree.lat, entree.lon);
    },
    [onClickEntree]
  );

  const entreeActive = entrees.find((e) => e.id === entreeSelectionnee);

  if (chargement) {
    return <div className="timeline-journal-vide">Chargement...</div>;
  }

  return (
    <div className="timeline-journal">
      {/* Frise chronologique */}
      <div className="timeline-frise">
        {entrees.length === 0 && !modeAjout && (
          <span className="timeline-frise-vide">Aucune entree. Ajoutez votre premiere note !</span>
        )}
        {entrees.map((entree) => (
          <button
            key={entree.id}
            className={`timeline-dot${entree.id === entreeSelectionnee ? " actif" : ""}`}
            onClick={() => handleClickDot(entree)}
            title={format(new Date(entree.timestamp), "HH:mm — d MMM", { locale: fr })}
          >
            <span className="timeline-dot-heure">
              {format(new Date(entree.timestamp), "HH:mm")}
            </span>
          </button>
        ))}
      </div>

      {/* Detail de l'entree selectionnee ou formulaire d'ajout */}
      <div className="timeline-detail">
        {modeAjout ? (
          <FormulaireEntree
            onSave={handleAjout}
            onCancel={() => setModeAjout(false)}
          />
        ) : entreeActive ? (
          <div className="timeline-entree-detail">
            <div className="timeline-entree-header">
              <span className="timeline-entree-heure">
                {format(new Date(entreeActive.timestamp), "HH:mm — d MMMM yyyy", { locale: fr })}
              </span>
              {entreeActive.lat != null && entreeActive.lon != null && (
                <span className="timeline-entree-coords">
                  <MapPin size={12} />
                  {entreeActive.lat.toFixed(4)}°, {entreeActive.lon.toFixed(4)}°
                </span>
              )}
              <button
                className="timeline-entree-supprimer"
                onClick={() => handleSuppression(entreeActive.id)}
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="timeline-entree-texte">{entreeActive.texte}</p>
          </div>
        ) : (
          <p className="timeline-detail-placeholder">
            Selectionnez une entree ou ajoutez-en une
          </p>
        )}
      </div>

      {/* Bouton ajouter */}
      {!modeAjout && (
        <button
          className="timeline-btn-ajouter"
          onClick={() => setModeAjout(true)}
        >
          <Plus size={16} />
          Note
        </button>
      )}
    </div>
  );
}
