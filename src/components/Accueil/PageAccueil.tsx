"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ResumeDossier, ResumeBateau, ResumeNavigation } from "@/lib/types";
import ArborescenceJournal from "./ArborescenceJournal";
import TracePreview from "./TracePreview";
import BarreMetaNav from "./BarreMetaNav";
import ModaleElement from "../Journal/ModaleElement";

const CarteFond = dynamic(() => import("./CarteFond"), { ssr: false });

interface ConfigModale {
  ouvert: boolean;
  type: "dossier" | "navigation";
  edition?: Record<string, unknown> | null;
  dossierId?: string;
  parentId?: string;
  parentNavId?: string;
}

const MODALE_FERMEE: ConfigModale = { ouvert: false, type: "dossier" };

interface PropsPageAccueil {
  dossiers: ResumeDossier[];
  bateaux: ResumeBateau[];
  portAttache?: { lat: number | null; lon: number | null; nom: string | null };
}

export default function PageAccueil({ dossiers, bateaux, portAttache }: PropsPageAccueil) {
  const routeur = useRouter();
  const [navPreview, setNavPreview] = useState<ResumeNavigation | null>(null);
  const [modale, setModale] = useState<ConfigModale>(MODALE_FERMEE);

  const gererClicNavigation = useCallback((nav: ResumeNavigation) => {
    setNavPreview(nav);
  }, []);

  const gererOuvrir = useCallback(
    (navId: string) => {
      routeur.push(`/navigation/${navId}`);
    },
    [routeur]
  );

  const ouvrirModaleNav = useCallback((dossierId: string, parentNavId?: string) => {
    setModale({ ouvert: true, type: "navigation", dossierId, parentNavId });
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
        await fetch(url, {
          method: estEdition ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees),
        });
      } else {
        const url = estEdition
          ? `/api/journal/navigations/${modale.edition?.id}`
          : "/api/journal/navigations";
        await fetch(url, {
          method: estEdition ? "PATCH" : "POST",
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
      <CarteFond
        centreLat={portAttache?.lat ?? undefined}
        centreLon={portAttache?.lon ?? undefined}
        portAttacheLat={portAttache?.lat}
        portAttacheLon={portAttache?.lon}
      >
        {navPreview && <TracePreview navigation={navPreview} />}
      </CarteFond>

      {navPreview && (
        <BarreMetaNav
          navigation={navPreview}
          onOuvrir={() => gererOuvrir(navPreview.slug ?? navPreview.id)}
        />
      )}

      <div className="accueil-panneaux">
        <ArborescenceJournal
          dossiers={dossiers}
          bateaux={bateaux}
          navActiveId={navPreview?.id ?? null}
          onClicNavigation={gererClicNavigation}
          onCreerDossier={ouvrirModaleDossier}
          onCreerNav={ouvrirModaleNav}
        />
      </div>

      <ModaleElement
        ouvert={modale.ouvert}
        onFermer={fermerModale}
        onValider={gererValiderModale}
        type={modale.type}
        edition={modale.edition}
        dossierId={modale.dossierId}
        parentId={modale.parentId}
        parentNavId={modale.parentNavId}
      />
    </div>
  );
}
