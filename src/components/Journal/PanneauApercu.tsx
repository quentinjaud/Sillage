"use client";

import { useMemo } from "react";
import ApercuTrace from "./ApercuTrace";
import { formaterDuree } from "@/lib/utilitaires";
import type { ResumeNavigation, ResumeAventure } from "@/lib/types";

interface PropsPanneauNavigation {
  type: "navigation";
  element: ResumeNavigation;
}

interface PropsPanneauAventure {
  type: "aventure";
  element: ResumeAventure;
}

type PropsPanneauApercu = PropsPanneauNavigation | PropsPanneauAventure | { type: null };

export default function PanneauApercu(props: PropsPanneauApercu) {
  if (props.type === null) {
    return <aside className="panneau-apercu panneau-apercu-vide" />;
  }
  if (props.type === "navigation") {
    return <ApercuNavigation navigation={props.element} />;
  }
  return <ApercuAventure aventure={props.element} />;
}

function ApercuNavigation({ navigation }: { navigation: ResumeNavigation }) {
  const polylines = useMemo(() => {
    if (!navigation.trace?.polylineSimplifiee) return [];
    return [navigation.trace.polylineSimplifiee];
  }, [navigation.trace?.polylineSimplifiee]);

  const dateFormatee = new Date(navigation.date).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <aside className="panneau-apercu">
      {polylines.length > 0 ? (
        <ApercuTrace polylines={polylines} largeur={260} hauteur={180} />
      ) : (
        <div className="panneau-apercu-no-trace">Aucune trace</div>
      )}
      <div className="panneau-apercu-infos">
        <h3 className="panneau-apercu-titre">{navigation.nom}</h3>
        <dl className="panneau-apercu-stats">
          <div className="panneau-apercu-stat">
            <dt>Depart</dt>
            <dd>{dateFormatee}</dd>
          </div>
          {navigation.trace?.distanceNm != null && (
            <div className="panneau-apercu-stat">
              <dt>Distance</dt>
              <dd>{navigation.trace.distanceNm.toFixed(1)} NM</dd>
            </div>
          )}
          {navigation.trace?.durationSeconds != null && (
            <div className="panneau-apercu-stat">
              <dt>Temps sur l&apos;eau</dt>
              <dd>{formaterDuree(navigation.trace.durationSeconds)}</dd>
            </div>
          )}
          {navigation.trace?.bateau && (
            <div className="panneau-apercu-stat">
              <dt>Bateau</dt>
              <dd>{navigation.trace.bateau.nom}</dd>
            </div>
          )}
          <div className="panneau-apercu-stat">
            <dt>Type</dt>
            <dd>{navigation.type === "REGATE" ? "Regate" : "Solo"}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function ApercuAventure({ aventure }: { aventure: ResumeAventure }) {
  const { polylines, distanceTotale, dureeTotale, nbNavs, premierDepart } = useMemo(() => {
    const polys: [number, number][][] = [];
    let dist = 0;
    let duree = 0;
    let premier: string | null = null;

    for (const nav of aventure.navigations) {
      if (nav.trace?.polylineSimplifiee) polys.push(nav.trace.polylineSimplifiee);
      if (nav.trace?.distanceNm) dist += nav.trace.distanceNm;
      if (nav.trace?.durationSeconds) duree += nav.trace.durationSeconds;
      if (!premier || nav.date < premier) premier = nav.date;
    }

    return { polylines: polys, distanceTotale: dist, dureeTotale: duree,
      nbNavs: aventure.navigations.length, premierDepart: premier };
  }, [aventure.navigations]);

  const dateFormatee = premierDepart
    ? new Date(premierDepart).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <aside className="panneau-apercu">
      {polylines.length > 0 ? (
        <ApercuTrace polylines={polylines} largeur={260} hauteur={180} />
      ) : (
        <div className="panneau-apercu-no-trace">Aucune trace</div>
      )}
      <div className="panneau-apercu-infos">
        <h3 className="panneau-apercu-titre">{aventure.nom}</h3>
        <dl className="panneau-apercu-stats">
          <div className="panneau-apercu-stat">
            <dt>Navigations</dt>
            <dd>{nbNavs}</dd>
          </div>
          {dateFormatee && (
            <div className="panneau-apercu-stat">
              <dt>Debut</dt>
              <dd>{dateFormatee}</dd>
            </div>
          )}
          {distanceTotale > 0 && (
            <div className="panneau-apercu-stat">
              <dt>Distance totale</dt>
              <dd>{distanceTotale.toFixed(1)} NM</dd>
            </div>
          )}
          {dureeTotale > 0 && (
            <div className="panneau-apercu-stat">
              <dt>Temps sur l&apos;eau</dt>
              <dd>{formaterDuree(dureeTotale)}</dd>
            </div>
          )}
        </dl>
      </div>
    </aside>
  );
}
