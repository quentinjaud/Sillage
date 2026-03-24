"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ResumeDossier, ResumeNavigation } from "@/lib/types";
import MarqueurDossier from "./MarqueurDossier";
import PanneauContenu from "./PanneauContenu";
import ProjectionTrace from "./ProjectionTrace";

const CarteOGF = dynamic(() => import("./CarteOGF"), { ssr: false });

interface PropsPageAccueil {
  dossiers: ResumeDossier[];
}

export default function PageAccueil({ dossiers }: PropsPageAccueil) {
  const routeur = useRouter();
  const [dossierActif, setDossierActif] = useState<string | null>(null);
  const [navPreview, setNavPreview] = useState<ResumeNavigation | null>(null);

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
        />
      )}

      {dossiers.length === 0 && (
        <div className="panneau-onboarding">
          <h2>Bienvenue sur Sillage</h2>
          <p>Placez votre premier port d attache pour commencer.</p>
          <button className="btn-principal" onClick={() => {}}>
            Creer un dossier
          </button>
        </div>
      )}

      <button
        className="btn-settings-accueil"
        title="Parametres"
        onClick={() => {}}
      >
        ⚙
      </button>
    </>
  );
}
