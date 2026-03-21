export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import FileUpload from "@/components/Upload/FileUpload";
import TraceList from "@/components/TraceList/TraceList";
import type { ResumeTrace } from "@/lib/types";

export default async function PageTraces() {
  // Le proxy protege deja cette route (cookie check).
  // Si obtenirSession echoue (erreur DB), on affiche la page en mode degrade.
  const session = await obtenirSession();

  let traces: ResumeTrace[] = [];
  let erreurBD = false;

  if (session) {
    try {
      const resultats = await prisma.trace.findMany({
        where: { userId: session.user.id },
        orderBy: [
          { startedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          name: true,
          filename: true,
          format: true,
          source: true,
          createdAt: true,
          startedAt: true,
          distanceNm: true,
          durationSeconds: true,
          avgSpeedKn: true,
          maxSpeedKn: true,
        },
      });
      traces = resultats.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        startedAt: t.startedAt?.toISOString() ?? null,
      }));
    } catch (erreur) {
      journalErreur("PageTraces", erreur);
      erreurBD = true;
    }
  } else {
    erreurBD = true;
  }

  return (
    <div className="page-container">
      {erreurBD && (
        <div className="error-banner">
          Impossible de charger les donnees. Veuillez rafraichir la page.
        </div>
      )}

      <section>
        <h2 className="section-title">Importer une trace</h2>
        <FileUpload />
      </section>

      <section>
        <h2 className="section-title">Mes traces</h2>
        <TraceList traces={traces} />
      </section>
    </div>
  );
}
