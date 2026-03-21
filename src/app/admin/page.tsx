export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import TableauUtilisateurs from "@/components/Admin/TableauUtilisateurs";
import type { ResumeUtilisateur } from "@/lib/types";

export default async function PageAdmin() {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    redirect("/traces");
  }

  const resultats = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          traces: true,
          bateaux: true,
        },
      },
    },
  });

  const utilisateurs: ResumeUtilisateur[] = resultats.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <nav className="admin-nav">
        <Link href="/admin" className="admin-nav-link active">
          Utilisateurs
        </Link>
        <Link href="/admin/traces" className="admin-nav-link">
          Traces
        </Link>
      </nav>

      <section className="admin-section">
        <h2 className="section-title">Utilisateurs ({utilisateurs.length})</h2>
        <TableauUtilisateurs utilisateurs={utilisateurs} />
      </section>
    </div>
  );
}
