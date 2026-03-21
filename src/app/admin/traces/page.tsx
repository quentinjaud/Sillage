export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import TransfertTrace from "@/components/Admin/TransfertTrace";
import type { ResumeUtilisateur } from "@/lib/types";

export default async function PageAdminTraces() {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    redirect("/traces");
  }

  const [traces, utilisateursResultats] = await Promise.all([
    prisma.trace.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userId: true,
        user: {
          select: { name: true },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
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
    }),
  ]);

  const tracesSerialises = traces.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const utilisateurs: ResumeUtilisateur[] = utilisateursResultats.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <nav className="admin-nav">
        <Link href="/admin" className="admin-nav-link">
          Utilisateurs
        </Link>
        <Link href="/admin/traces" className="admin-nav-link active">
          Traces
        </Link>
      </nav>

      <section className="admin-section">
        <h2 className="section-title">
          Toutes les traces ({tracesSerialises.length})
        </h2>
        <TransfertTrace
          traces={tracesSerialises}
          utilisateurs={utilisateurs}
        />
      </section>
    </div>
  );
}
