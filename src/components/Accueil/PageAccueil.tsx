"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ResumeDossier, ResumeNavigation } from "@/lib/types";
import PanneauContenu from "./PanneauContenu";
import TracePreview from "./TracePreview";
import ModaleElement from "../Journal/ModaleElement";
import PanneauSettings from "../PanneauSettings";

const CarteOGF = dynamic(() => import("./CarteOGF"), { ssr: false });

interface ConfigModale {
  ouvert: boolean;
  type: "dossier" | "navigation";
  edition?: Record<string, unknown> | null;
  dossierId?: string;
  parentId?: string;
}

const MODALE_FERMEE: ConfigModale = { ouvert: false, type: "dossier" };

interface PropsPageAccueil {
  dossiers: ResumeDossier[];
}

export default function PageAccueil({ dossiers }: PropsPageAccueil) {
  const routeur = useRouter();
  const [dossierActif, setDossierActif] = useState<string | null>(null);
  const [navPreview, setNavPreview] = useState<ResumeNavigation | null>(null);
  const [modale, setModale] = useState<ConfigModale>(MODALE_FERMEE);
  const [settingsOuvert, setSettingsOuvert] = useState(false);

  const dossierSelectionne = dossiers.find((d) => d.id === dossierActif);

  const gererClicDossier = useCallback((dossierId: string) => {
    setDossierActif((prev) => (prev === dossierId ? null : dossierId));
    setNavPreview(null);
  }, []);

  const gererClicNavigation = useCallback((nav: ResumeNavigation) => {
    setNavPreview(nav);
  }, []);

  const gererOuvrir = useCallback(
    (navId: string) => {
      routeur.push(`/navigation/${navId}`);
    },
    [routeur]
  );

  const gererFermer = useCallback(() => {
    setDossierActif(null);
    setNavPreview(null);
  }, []);

  // --- Modale creation/edition ---

  const ouvrirModaleNav = useCallback((dossierId: string) => {
    setModale({ ouvert: true, type: "navigation", dossierId });
  }, []);

  const ouvrirModaleSousDossier = useCallback((parentId: string) => {
    setModale({ ouvert: true, type: "dossier", parentId });
  }, []);

  const ouvrirModaleDossier = useCallback(() => {
    setModale({ ouvert: true, type: "dossier" });
  }, []);

  const fermerModale = useCallback(() => {
    setModale(MODALE_FERMEE);
  }, []);

  const gererValiderModale = useCallback(
    async (donnees: Record<string, unknown>) => {
      const estEdition = !!modale.edition;

      if (modale.type === "dossier") {
        const url = estEdition
          ? `/api/journal/dossiers/${modale.edition?.id}`
          : "/api/journal/dossiers";
        const method = estEdition ? "PATCH" : "POST";
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees),
        });
      } else {
        const url = estEdition
          ? `/api/journal/navigations/${modale.edition?.id}`
          : "/api/journal/navigations";
        const method = estEdition ? "PATCH" : "POST";
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees),
        });
      }

      fermerModale();
      routeur.refresh();
    },
    [modale, fermerModale, routeur]
  );

  return (
    <div className="accueil-layout">
      {/* Carte OSM plein ecran */}
      <CarteOGF>
        {navPreview && <TracePreview navigation={navPreview} />}
      </CarteOGF>

      {/* Panneaux flottants empiles verticalement */}
      <div className="accueil-panneaux">
        {/* Panneau dossiers */}
        <div className="accueil-panneau-dossiers">
          <div className="accueil-panneau-header">
            <h2 className="accueil-panneau-titre">Mes dossiers</h2>
          </div>

          {dossiers.length === 0 ? (
            <div className="accueil-panneau-vide">
              <p>Bienvenue Marin !</p>
              <p>Cree ton premier dossier pour commencer.</p>
              <button className="btn-principal" onClick={ouvrirModaleDossier}>
                Creer un dossier
              </button>
            </div>
          ) : (
            <div className="accueil-liste-dossiers">
              {dossiers.map((dossier) => (
                <button
                  key={dossier.id}
                  className={`accueil-dossier-item ${dossier.id === dossierActif ? "accueil-dossier-item-actif" : ""}`}
                  onClick={() => gererClicDossier(dossier.id)}
                >
                  <span className="accueil-dossier-nom">{dossier.nom}</span>
                  <span className="accueil-dossier-count">
                    {dossier.nbNavigations + dossier.nbSousDossiers}
                  </span>
                </button>
              ))}
              <button
                className="accueil-dossier-item accueil-dossier-item-nouveau"
                onClick={ouvrirModaleDossier}
              >
                + Nouveau dossier
              </button>
            </div>
          )}
        </div>

        {/* Panneau contenu — se deploie sous le panneau dossiers */}
        {dossierActif && dossierSelectionne && (
          <PanneauContenu
            dossierId={dossierActif}
            nomDossier={dossierSelectionne.nom}
            onFermer={gererFermer}
            onClicNavigation={gererClicNavigation}
            onOuvrir={gererOuvrir}
            onCreerNav={ouvrirModaleNav}
            onCreerSousDossier={ouvrirModaleSousDossier}
          />
        )}
      </div>

      <PanneauSettings
        ouvert={settingsOuvert}
        onFermer={() => setSettingsOuvert(false)}
      />

      <ModaleElement
        ouvert={modale.ouvert}
        onFermer={fermerModale}
        onValider={gererValiderModale}
        type={modale.type}
        edition={modale.edition}
        dossierId={modale.dossierId}
        parentId={modale.parentId}
      />
    </div>
  );
}
