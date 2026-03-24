"use client";

import { useCallback, useEffect, useState } from "react";
import FileUpload from "@/components/Upload/FileUpload";
import TraceList from "@/components/TraceList/TraceList";
import type { ResumeTrace, ResumeBateau } from "@/lib/types";

export default function ContenuTraces() {
  const [traces, setTraces] = useState<ResumeTrace[]>([]);
  const [bateaux, setBateaux] = useState<ResumeBateau[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const [repTraces, repBateaux] = await Promise.all([
        fetch("/api/traces"),
        fetch("/api/bateaux"),
      ]);
      if (repTraces.ok) setTraces(await repTraces.json());
      if (repBateaux.ok) setBateaux(await repBateaux.json());
    } catch {
      // silencieux — les composants enfants gerent l'etat vide
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement) {
    return <div className="panneau-chargement">Chargement...</div>;
  }

  return (
    <div className="contenu-panneau-traces">
      <FileUpload />
      <TraceList traces={traces} bateaux={bateaux} />
    </div>
  );
}
