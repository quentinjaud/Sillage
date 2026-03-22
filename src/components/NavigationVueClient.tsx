"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import TraceChart from "@/components/Stats/TraceChart";
import Timeline from "@/components/Stats/Timeline";
import PanneauStats from "@/components/Stats/PanneauStats";
import GraphiqueRedimensionnable from "@/components/Stats/GraphiqueRedimensionnable";
import type { PointCarte } from "@/lib/types";
import { useEtatVue, HAUTEUR_GRAPHIQUE_INITIALE } from "@/lib/hooks/useEtatVue";

interface PropsNavigationVueClient {
  navigationId: string;
  nom: string;
  date: string;
  type: "SOLO" | "REGATE";
  bateau: { id: string; nom: string } | null;
  points: PointCarte[];
  maxSpeed: number;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
}

export default function NavigationVueClient({
  navigationId,
  nom,
  date,
  type,
  bateau,
  points,
  maxSpeed,
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
}: PropsNavigationVueClient) {
  const router = useRouter();
  const {
    paddingBas,
    pointActifIndex,
    setPointActifIndex,
    donneeGraphee,
    setDonneeGraphee,
    capDisponible,
    pointActif,
    handleHauteurChange,
  } = useEtatVue(points);

  // Edition metadonnees — synchro avec props serveur apres refresh
  const [nomEdite, setNomEdite] = useState(nom);
  const [enEditionNom, setEnEditionNom] = useState(false);
  const [typeEdite, setTypeEdite] = useState(type);
  const [dateEditee, setDateEditee] = useState(date.slice(0, 10));

  useEffect(() => {
    setNomEdite(nom);
    setTypeEdite(type);
    setDateEditee(date.slice(0, 10));
  }, [nom, type, date]);

  // Sauvegarde generique d'un champ via PATCH
  const sauvegarderChamp = useCallback(
    async (champ: Record<string, unknown>) => {
      try {
        const reponse = await fetch(
          `/api/journal/navigations/${navigationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(champ),
          }
        );
        if (!reponse.ok) throw new Error();
        router.refresh();
        return true;
      } catch {
        return false;
      }
    },
    [navigationId, router]
  );

  const sauvegarderNom = useCallback(async () => {
    const nomNettoye = nomEdite.trim();
    if (!nomNettoye || nomNettoye === nom) {
      setNomEdite(nom);
      setEnEditionNom(false);
      return;
    }
    const ok = await sauvegarderChamp({ nom: nomNettoye });
    if (!ok) setNomEdite(nom);
    setEnEditionNom(false);
  }, [nomEdite, nom, sauvegarderChamp]);

  const handleChangeType = useCallback(async () => {
    const nouveauType = typeEdite === "SOLO" ? "REGATE" : "SOLO";
    setTypeEdite(nouveauType);
    const ok = await sauvegarderChamp({ type: nouveauType });
    if (!ok) setTypeEdite(type);
  }, [typeEdite, type, sauvegarderChamp]);

  const handleChangeDate = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const nouvelleDate = e.target.value;
      setDateEditee(nouvelleDate);
      if (nouvelleDate) {
        const ok = await sauvegarderChamp({ date: new Date(nouvelleDate).toISOString() });
        if (!ok) setDateEditee(date.slice(0, 10));
      }
    },
    [date, sauvegarderChamp]
  );

  return (
    <div style={{ "--hauteur-graphique": `${paddingBas}px` } as React.CSSProperties}>
      {/* Panneau stats + metadonnees navigation */}
      <div className="trace-vue-stats">
        <div className="navigation-meta">
          {enEditionNom ? (
            <input
              className="titre-editable-input"
              value={nomEdite}
              onChange={(e) => setNomEdite(e.target.value)}
              onBlur={sauvegarderNom}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sauvegarderNom();
                }
                if (e.key === "Escape") {
                  setNomEdite(nom);
                  setEnEditionNom(false);
                }
              }}
              autoFocus
            />
          ) : (
            <h2
              className="navigation-nom titre-editable"
              onClick={() => setEnEditionNom(true)}
              title="Cliquer pour renommer"
            >
              {nom}
            </h2>
          )}
          <div className="navigation-meta-details">
            <input
              type="date"
              className="navigation-date-input"
              value={dateEditee}
              onChange={handleChangeDate}
            />
            <button
              className={`badge-type badge-type-${typeEdite.toLowerCase()} badge-type-cliquable`}
              onClick={handleChangeType}
              title="Cliquer pour basculer Solo/Regate"
            >
              {typeEdite === "REGATE" ? "Regate" : "Solo"}
            </button>
            {bateau && <span>{bateau.nom}</span>}
          </div>
        </div>
        <PanneauStats
          distanceNm={distanceNm}
          durationSeconds={durationSeconds}
          avgSpeedKn={avgSpeedKn}
          maxSpeedKn={maxSpeedKn}
          pointActif={pointActif}
          donneeGraphee={donneeGraphee}
          onChangeDonneeGraphee={setDonneeGraphee}
          capDisponible={capDisponible}
        />
      </div>

      {/* Carte */}
      <div className="trace-vue-carte">
        <TraceMapWrapper
          points={points}
          maxSpeed={maxSpeed}
          paddingBottom={paddingBas}
          pointActifIndex={pointActifIndex}
          onHoverPoint={setPointActifIndex}
        />
      </div>

      {/* Graphique + timeline */}
      <div className="trace-vue-graphique">
        <GraphiqueRedimensionnable
          hauteurInitiale={HAUTEUR_GRAPHIQUE_INITIALE}
          hauteurMin={80}
          hauteurMax={450}
          onHauteurChange={handleHauteurChange}
        >
          <TraceChart
            points={points}
            donnee={donneeGraphee}
            pointActifIndex={pointActifIndex}
            onHoverPoint={setPointActifIndex}
          />
          <Timeline
            points={points}
            pointActifIndex={pointActifIndex}
            onChangeIndex={setPointActifIndex}
          />
        </GraphiqueRedimensionnable>
      </div>
    </div>
  );
}
