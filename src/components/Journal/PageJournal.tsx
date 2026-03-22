"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  ResumeDossier,
  ResumeBateau,
  ResumeTrace,
  ResumeAventure,
  ResumeNavigation,
  ContenuDossier,
} from "@/lib/types";
import BarreActionsJournal from "./BarreActionsJournal";
import CarteDossier from "./CarteDossier";
import ContenuDossierComp from "./ContenuDossier";
import PanneauApercu from "./PanneauApercu";
import ModaleElement from "./ModaleElement";

interface PropsPageJournal {
  dossiers: ResumeDossier[];
  bateaux: ResumeBateau[];
  tracesDisponibles: ResumeTrace[];
}

type ElementSurvole =
  | { type: "aventure"; element: ResumeAventure }
  | { type: "navigation"; element: ResumeNavigation }
  | { type: null };

type ModaleConfig = {
  ouvert: boolean;
  type: "dossier" | "aventure" | "navigation";
  edition: Record<string, unknown> | null;
  dossierId?: string;
  aventureId?: string | null;
};

export default function PageJournal({
  dossiers,
  bateaux,
  tracesDisponibles,
}: PropsPageJournal) {
  const routeur = useRouter();

  const [dossiersOuverts, setDossiersOuverts] = useState<Set<string>>(new Set());
  const [cacheContenu, setCacheContenu] = useState<Map<string, ContenuDossier>>(new Map());
  const [chargement, setChargement] = useState<Set<string>>(new Set());
  const [survol, setSurvol] = useState<ElementSurvole>({ type: null });
  const [filtreBateau, setFiltreBateau] = useState("");
  const [filtreType, setFiltreType] = useState("");
  const [modale, setModale] = useState<ModaleConfig>({
    ouvert: false,
    type: "dossier",
    edition: null,
  });

  const chargerContenu = useCallback(async (dossierId: string) => {
    setChargement((prev) => new Set(prev).add(dossierId));
    try {
      const res = await fetch(`/api/journal/dossiers/${dossierId}/contenu`);
      if (res.ok) {
        const contenu: ContenuDossier = await res.json();
        setCacheContenu((prev) => new Map(prev).set(dossierId, contenu));
      }
    } finally {
      setChargement((prev) => {
        const next = new Set(prev);
        next.delete(dossierId);
        return next;
      });
    }
  }, []);

  const toggleDossier = useCallback(
    (dossierId: string) => {
      setDossiersOuverts((prev) => {
        const next = new Set(prev);
        if (next.has(dossierId)) {
          next.delete(dossierId);
        } else {
          next.add(dossierId);
          if (!cacheContenu.has(dossierId)) {
            chargerContenu(dossierId);
          }
        }
        return next;
      });
    },
    [cacheContenu, chargerContenu]
  );

  const invaliderCache = useCallback(
    async (dossierId: string) => {
      await chargerContenu(dossierId);
    },
    [chargerContenu]
  );

  const handleValiderModale = useCallback(
    async (donnees: Record<string, unknown>) => {
      const { type, edition, dossierId } = modale;

      try {
        if (type === "dossier") {
          if (edition) {
            await fetch(`/api/journal/dossiers/${edition.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else {
            await fetch("/api/journal/dossiers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
        } else if (type === "aventure") {
          if (edition) {
            await fetch(`/api/journal/aventures/${edition.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else {
            await fetch(`/api/journal/dossiers/${dossierId}/aventures`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
          if (dossierId) await invaliderCache(dossierId);
        } else if (type === "navigation") {
          if (edition) {
            await fetch(`/api/journal/navigations/${edition.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else {
            await fetch("/api/journal/navigations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
          if (dossierId) await invaliderCache(dossierId);
        }

        routeur.refresh();
      } finally {
        setModale({ ouvert: false, type: "dossier", edition: null });
      }
    },
    [modale, invaliderCache, routeur]
  );

  const handleSupprimer = useCallback(
    async (type: "dossier" | "aventure" | "navigation", id: string, dossierId?: string) => {
      const messages: Record<string, string> = {
        dossier: "Supprimer ce dossier et tout son contenu (aventures, navigations) ?",
        aventure: "Supprimer cette aventure et ses navigations ?",
        navigation: "Supprimer cette navigation ?",
      };

      if (!window.confirm(messages[type])) return;

      const urls: Record<string, string> = {
        dossier: `/api/journal/dossiers/${id}`,
        aventure: `/api/journal/aventures/${id}`,
        navigation: `/api/journal/navigations/${id}`,
      };

      await fetch(urls[type], { method: "DELETE" });

      if (dossierId) await invaliderCache(dossierId);
      routeur.refresh();
    },
    [invaliderCache, routeur]
  );

  const filtrerContenu = useCallback(
    (contenu: ContenuDossier): ContenuDossier => {
      if (!filtreBateau && !filtreType) return contenu;

      const filtrerNavigation = (nav: ResumeNavigation): boolean => {
        if (filtreType && nav.type !== filtreType) return false;
        if (filtreBateau && nav.trace?.bateau?.id !== filtreBateau) return false;
        return true;
      };

      const navigationsOrphelines = contenu.navigationsOrphelines.filter(filtrerNavigation);

      const aventures = contenu.aventures
        .map((a) => ({
          ...a,
          navigations: a.navigations.filter(filtrerNavigation),
        }))
        .filter((a) => a.navigations.length > 0);

      return { aventures, navigationsOrphelines };
    },
    [filtreBateau, filtreType]
  );

  return (
    <div className="journal-layout">
      <div className="journal-contenu">
        <BarreActionsJournal
          onNouveauDossier={() =>
            setModale({ ouvert: true, type: "dossier", edition: null })
          }
          bateaux={bateaux}
          filtreBateau={filtreBateau}
          onFiltreBateau={setFiltreBateau}
          filtreType={filtreType}
          onFiltreType={setFiltreType}
        />

        {dossiers.length === 0 ? (
          <div className="journal-vide">
            <div className="journal-vide-icone">📒</div>
            <p className="journal-vide-texte">
              Creez votre premier dossier pour organiser vos navigations.
            </p>
          </div>
        ) : (
          dossiers.map((dossier) => {
            const contenu = cacheContenu.get(dossier.id);
            return (
              <CarteDossier
                key={dossier.id}
                dossier={dossier}
                ouvert={dossiersOuverts.has(dossier.id)}
                onToggle={() => toggleDossier(dossier.id)}
                onEditer={(d) =>
                  setModale({
                    ouvert: true,
                    type: "dossier",
                    edition: d as unknown as Record<string, unknown>,
                  })
                }
                onSupprimer={(id) => handleSupprimer("dossier", id)}
              >
                {chargement.has(dossier.id) && <p>Chargement...</p>}
                {contenu && (
                  <ContenuDossierComp
                    contenu={filtrerContenu(contenu)}
                    dossierId={dossier.id}
                    onSurvolNavigation={(n) =>
                      setSurvol(n ? { type: "navigation", element: n } : { type: null })
                    }
                    onAjouterAventure={() =>
                      setModale({
                        ouvert: true,
                        type: "aventure",
                        edition: null,
                        dossierId: dossier.id,
                      })
                    }
                    onAjouterNavigation={(aventureId) =>
                      setModale({
                        ouvert: true,
                        type: "navigation",
                        edition: null,
                        dossierId: dossier.id,
                        aventureId,
                      })
                    }
                    onEditerAventure={(a) =>
                      setModale({
                        ouvert: true,
                        type: "aventure",
                        edition: a as unknown as Record<string, unknown>,
                        dossierId: dossier.id,
                      })
                    }
                    onSupprimerAventure={(id) =>
                      handleSupprimer("aventure", id, dossier.id)
                    }
                    onEditerNavigation={(n) =>
                      setModale({
                        ouvert: true,
                        type: "navigation",
                        edition: {
                          ...(n as unknown as Record<string, unknown>),
                          traceId: n.trace?.id ?? null,
                        },
                        dossierId: dossier.id,
                        aventureId: n.aventureId,
                      })
                    }
                    onSupprimerNavigation={(id) =>
                      handleSupprimer("navigation", id, dossier.id)
                    }
                  />
                )}
              </CarteDossier>
            );
          })
        )}

        {(filtreBateau || filtreType) && (
          <p className="journal-filtre-note">
            Les filtres s&apos;appliquent uniquement aux dossiers deplies.
          </p>
        )}
      </div>

      <PanneauApercu {...survol} />

      <ModaleElement
        ouvert={modale.ouvert}
        onFermer={() => setModale({ ouvert: false, type: "dossier", edition: null })}
        onValider={handleValiderModale}
        type={modale.type}
        edition={modale.edition}
        dossierId={modale.dossierId}
        aventureId={modale.aventureId}
        tracesDisponibles={tracesDisponibles}
      />
    </div>
  );
}
