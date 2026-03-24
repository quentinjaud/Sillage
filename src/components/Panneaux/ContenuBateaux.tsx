"use client";

import { useCallback, useEffect, useState } from "react";
import ListeBateaux from "@/components/Bateau/ListeBateaux";
import type { ResumeBateau } from "@/lib/types";

export default function ContenuBateaux() {
  const [bateaux, setBateaux] = useState<ResumeBateau[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const rep = await fetch("/api/bateaux");
      if (rep.ok) setBateaux(await rep.json());
    } catch {
      // silencieux
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

  return <ListeBateaux bateaux={bateaux} />;
}
