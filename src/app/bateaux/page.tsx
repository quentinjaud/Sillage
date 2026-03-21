export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import ListeBateaux from "@/components/Bateau/ListeBateaux";
import type { ResumeBateau } from "@/lib/types";

export default async function PageBateaux() {
  const session = await obtenirSession();

  let bateaux: ResumeBateau[] = [];
  let erreurBD = false;

  if (session) {
    try {
      const resultats = await prisma.bateau.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
      bateaux = resultats.map((b) => ({
        id: b.id,
        nom: b.nom,
        classe: b.classe,
        longueur: b.longueur,
        createdAt: b.createdAt.toISOString(),
      }));
    } catch (erreur) {
      journalErreur("PageBateaux", erreur);
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
      <ListeBateaux bateaux={bateaux} />
    </div>
  );
}
