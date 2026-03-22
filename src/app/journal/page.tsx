export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { redirect } from "next/navigation";
import { journalErreur } from "@/lib/journal";
import PageJournal from "@/components/Journal/PageJournal";
import type { ResumeDossier, ResumeBateau, ResumeTrace } from "@/lib/types";

export default async function PageJournalServeur() {
  const session = await obtenirSession();
  if (!session) {
    redirect("/connexion?retour=/journal");
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  let dossiers: ResumeDossier[] = [];
  let bateaux: ResumeBateau[] = [];
  let tracesDisponibles: ResumeTrace[] = [];
  let erreurBD = false;

  try {
    const [resultDossiers, resultBateaux, resultTraces] = await Promise.all([
      prisma.dossier.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { aventures: true, navigations: true } } },
      }),
      prisma.bateau.findMany({
        where: { userId },
        orderBy: { nom: "asc" },
      }),
      // Traces not linked to any navigation (available for association)
      prisma.trace.findMany({
        where: { userId, navigation: null },
        orderBy: [{ startedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        select: {
          id: true, name: true, filename: true, format: true, source: true,
          createdAt: true, startedAt: true,
          distanceNm: true, durationSeconds: true, avgSpeedKn: true, maxSpeedKn: true,
          bateauId: true, bateau: { select: { id: true, nom: true } },
        },
      }),
    ]);

    dossiers = resultDossiers.map((d) => ({
      id: d.id, nom: d.nom, description: d.description,
      nbAventures: d._count.aventures, nbNavigations: d._count.navigations,
      createdAt: d.createdAt.toISOString(),
    }));

    bateaux = resultBateaux.map((b) => ({
      id: b.id, nom: b.nom, classe: b.classe, longueur: b.longueur,
      createdAt: b.createdAt.toISOString(),
    }));

    tracesDisponibles = resultTraces.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
    }));
  } catch (erreur) {
    journalErreur("PageJournal", erreur);
    erreurBD = true;
  }

  return (
    <>
      {erreurBD && (
        <div className="error-banner" style={{ margin: "24px" }}>
          Impossible de charger les donnees. Veuillez rafraichir la page.
        </div>
      )}
      <PageJournal dossiers={dossiers} bateaux={bateaux} tracesDisponibles={tracesDisponibles} />
    </>
  );
}
