import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";

export async function GET() {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const utilisateurs = await prisma.user.findMany({
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

  return NextResponse.json(utilisateurs);
}
