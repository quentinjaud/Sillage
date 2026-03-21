export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ListeBateaux from "@/components/Bateau/ListeBateaux";
import type { ResumeBateau } from "@/lib/types";

export default async function PageBateaux() {
  const session = await obtenirSession();
  if (!session) {
    redirect("/connexion");
  }

  const resultats = await prisma.bateau.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const bateaux: ResumeBateau[] = resultats.map((b) => ({
    id: b.id,
    nom: b.nom,
    type: b.type,
    classe: b.classe,
    longueur: b.longueur,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <ListeBateaux bateaux={bateaux} />
    </div>
  );
}
