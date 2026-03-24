"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ResumeDossier, ResumeNavigation } from "@/lib/types";
import MarqueurDossier from "./MarqueurDossier";
import PanneauContenu from "./PanneauContenu";
import ProjectionTrace from "./ProjectionTrace";
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

  const gererClicCarte = useCallback(() => {
    setDossierActif(null);
    setNavPreview(null);
  }, []);

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

  const gererDragDossier = useCallback(
    async (dossierId: string, lat: number, lon: number) => {
      await fetch(`/api/journal/dossiers/${dossierId}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markerLat: lat, markerLon: lon }),
      });
      routeur.refresh();
    },
    [routeur]
  );

  // --- Modale creation/edition ---

  const ouvrirModaleNav = useCallback((dossierId: string) => {
    setModale({ ouvert: true, type: "navigation", dossierId });
  }, []);

  const ouvrirModaleSousDossier = useCallback((parentId: string) => {
    setModale({ ouvert: true, type: "dossier", parentId });
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
    <>
      <CarteOGF onClicCarte={gererClicCarte}>
        {dossiers.map((dossier) => (
          <MarqueurDossier
            key={dossier.id}
            dossier={dossier}
            actif={dossier.id === dossierActif}
            onClick={gererClicDossier}
            onDragEnd={gererDragDossier}
          />
        ))}
        {navPreview && <ProjectionTrace navigation={navPreview} />}
      </CarteOGF>

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

      {dossiers.length === 0 && (
        <div className="panneau-onboarding">
          <h2>Bienvenue Marin !</h2>
          <p>
            Place ton premier port d&apos;attache pour commencer a tracer des
            sillages.
          </p>
          <button
            className="btn-principal"
            onClick={() =>
              setModale({ ouvert: true, type: "dossier" })
            }
          >
            Creer mon premier dossier
          </button>
        </div>
      )}

      <button
        className="btn-settings-accueil"
        title="Parametres"
        onClick={() => setSettingsOuvert(true)}
      >
        ⚙
      </button>

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
    </>
  );
}
