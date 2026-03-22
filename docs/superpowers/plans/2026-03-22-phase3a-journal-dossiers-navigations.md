# Phase 3a — Journal : dossiers & navigations — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le squelette organisationnel du journal de bord (dossiers, aventures, navigations) avec page `/journal`, panneau d'apercu et mini-carte N&B.

**Architecture:** Nouveaux modeles Prisma (Dossier, Aventure, Navigation) + champ polylineSimplifiee sur Trace. API REST CRUD sous `/api/journal/`. Page `/journal` avec server component + client component (approche hybride C : cartes depliables + panneau lateral fixe). Mini-carte via tuiles OSM raster + SVG overlay (pas de MapLibre).

**Tech Stack:** Next.js 16, React 19, TypeScript, Mantine, Prisma 7, PostgreSQL, CSS vanilla

**Spec:** `docs/superpowers/specs/2026-03-22-phase3a-journal-dossiers-navigations.md`

---

## Task 1 : Schema Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Ajouter les nouveaux modeles au schema Prisma**

Dans `prisma/schema.prisma`, ajouter apres le bloc `TrackPoint` :

```prisma
// === Journal de bord ===

enum TypeNavigation {
  SOLO
  REGATE
}

model Dossier {
  id          String       @id @default(cuid())
  nom         String
  description String?
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  aventures   Aventure[]
  navigations Navigation[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
}

model Aventure {
  id          String       @id @default(cuid())
  nom         String
  description String?
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  dossierId   String
  dossier     Dossier      @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  navigations Navigation[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([dossierId])
  @@index([userId])
}

model Navigation {
  id         String         @id @default(cuid())
  nom        String
  date       DateTime
  type       TypeNavigation @default(SOLO)
  userId     String
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  dossierId  String
  dossier    Dossier        @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  aventureId String?
  aventure   Aventure?      @relation(fields: [aventureId], references: [id], onDelete: Cascade)
  traceId    String?        @unique
  trace      Trace?         @relation(fields: [traceId], references: [id], onDelete: SetNull)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([dossierId])
  @@index([aventureId])
  @@index([userId])
}
```

Modifier le modele `User` — ajouter les relations :

```prisma
  dossiers    Dossier[]
  aventures   Aventure[]
  navigations Navigation[]
```

Modifier le modele `Trace` — ajouter :

```prisma
  polylineSimplifiee Json?
  navigation         Navigation?
```

- [ ] **Step 2: Generer et appliquer la migration**

Run: `rtk npx prisma migrate dev --name ajout-journal-dossiers-navigations`
Expected: migration creee et appliquee, client Prisma regenere

- [ ] **Step 3: Verifier que le build Prisma passe**

Run: `rtk npx prisma generate`
Expected: client genere sans erreur

- [ ] **Step 4: Commit**

```bash
rtk git add prisma/schema.prisma prisma/migrations/
rtk git commit -m "$(cat <<'EOF'
feat: schema journal — Dossier, Aventure, Navigation + polylineSimplifiee
EOF
)"
```

---

## Task 2 : Calcul polylineSimplifiee a l'import

**Files:**
- Modify: `src/lib/services/import-trace.ts`

- [ ] **Step 1: Ajouter le calcul de la polyline simplifiee dans importerTrace**

Dans `src/lib/services/import-trace.ts`, ajouter l'import :

```typescript
import { simplifierRDP } from "@/lib/geo/simplification";
```

Apres le calcul des statistiques (ligne ~46), ajouter :

```typescript
  // Polyline simplifiee pour les mini-cartes d'apercu (50-100 points)
  const pointsNonExclus = analysee.points.filter((_, i) => !indexAberrants.has(i));
  const pointsSimplifies = simplifierRDP(pointsNonExclus, 0.005); // ~9m tolerance
  const polylineSimplifiee = pointsSimplifies.map((p) => [p.lon, p.lat]);
```

Ajouter `polylineSimplifiee` dans le `prisma.trace.create({ data: { ... } })` :

```typescript
      polylineSimplifiee,
```

- [ ] **Step 2: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/lib/services/import-trace.ts
rtk git commit -m "$(cat <<'EOF'
feat: calcul polylineSimplifiee a l'import (RDP 50-100 points)
EOF
)"
```

---

## Task 3 : Types TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Ajouter les types pour le journal**

Dans `src/lib/types.ts`, ajouter :

```typescript
// === Journal de bord ===

export interface ResumeDossier {
  id: string;
  nom: string;
  description: string | null;
  nbAventures: number;
  nbNavigations: number;
  createdAt: string;
}

export interface ResumeAventure {
  id: string;
  nom: string;
  description: string | null;
  navigations: ResumeNavigation[];
  createdAt: string;
}

export interface ResumeTraceNavigation {
  id: string;
  name: string;
  bateau: { id: string; nom: string } | null;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  polylineSimplifiee: [number, number][] | null;
}

export interface ResumeNavigation {
  id: string;
  nom: string;
  date: string;
  type: "SOLO" | "REGATE";
  dossierId: string;
  aventureId: string | null;
  trace: ResumeTraceNavigation | null;
  createdAt: string;
}

export interface ContenuDossier {
  aventures: ResumeAventure[];
  navigationsOrphelines: ResumeNavigation[];
}
```

- [ ] **Step 2: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/lib/types.ts
rtk git commit -m "$(cat <<'EOF'
feat: types journal — ResumeDossier, ResumeAventure, ResumeNavigation
EOF
)"
```

---

## Task 4 : API dossiers (CRUD + contenu)

**Files:**
- Create: `src/app/api/journal/dossiers/route.ts`
- Create: `src/app/api/journal/dossiers/[id]/route.ts`
- Create: `src/app/api/journal/dossiers/[id]/contenu/route.ts`

Le pattern API a suivre est dans `src/app/api/traces/[id]/route.ts` :
- `obtenirSession()` → 401 si null
- `obtenirIdUtilisateurEffectif(session)` pour le userId
- Verifier ownership via `userId` sur le modele
- `journalErreur()` pour les erreurs
- `NextResponse.json()` pour les reponses

- [ ] **Step 1: Creer GET + POST /api/journal/dossiers**

Creer `src/app/api/journal/dossiers/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function GET() {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const dossiers = await prisma.dossier.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { aventures: true, navigations: true },
        },
      },
    });

    return NextResponse.json(
      dossiers.map((d) => ({
        id: d.id,
        nom: d.nom,
        description: d.description,
        nbAventures: d._count.aventures,
        nbNavigations: d._count.navigations,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (erreur) {
    journalErreur("GET /api/journal/dossiers", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const { nom, description } = await requete.json();
    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const dossier = await prisma.dossier.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        userId,
      },
    });

    return NextResponse.json({
      id: dossier.id,
      nom: dossier.nom,
      description: dossier.description,
      nbAventures: 0,
      nbNavigations: 0,
      createdAt: dossier.createdAt.toISOString(),
    }, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/dossiers", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Creer PATCH + DELETE /api/journal/dossiers/[id]**

Creer `src/app/api/journal/dossiers/[id]/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function PATCH(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const dossier = await prisma.dossier.findFirst({
    where: { id, userId },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    const { nom, description } = await requete.json();
    const data: Record<string, unknown> = {};
    if (nom !== undefined) {
      if (typeof nom !== "string" || nom.trim().length === 0) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      data.nom = nom.trim();
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    const maj = await prisma.dossier.update({
      where: { id },
      data,
    });

    return NextResponse.json(maj);
  } catch (erreur) {
    journalErreur("PATCH /api/journal/dossiers/[id]", erreur);
    return NextResponse.json({ error: "Erreur de mise a jour" }, { status: 500 });
  }
}

export async function DELETE(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const dossier = await prisma.dossier.findFirst({
    where: { id, userId },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    await prisma.dossier.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/journal/dossiers/[id]", erreur);
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Creer GET /api/journal/dossiers/[id]/contenu**

Creer `src/app/api/journal/dossiers/[id]/contenu/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import type { ResumeNavigation, ResumeAventure } from "@/lib/types";

const selectTrace = {
  id: true,
  name: true,
  distanceNm: true,
  durationSeconds: true,
  avgSpeedKn: true,
  maxSpeedKn: true,
  polylineSimplifiee: true,
  bateau: { select: { id: true, nom: true } },
} as const;

const selectNavigation = {
  id: true,
  nom: true,
  date: true,
  type: true,
  dossierId: true,
  aventureId: true,
  createdAt: true,
  trace: { select: selectTrace },
} as const;

function formaterNavigation(nav: {
  id: string;
  nom: string;
  date: Date;
  type: string;
  dossierId: string;
  aventureId: string | null;
  createdAt: Date;
  trace: {
    id: string;
    name: string;
    distanceNm: number | null;
    durationSeconds: number | null;
    avgSpeedKn: number | null;
    maxSpeedKn: number | null;
    polylineSimplifiee: unknown;
    bateau: { id: string; nom: string } | null;
  } | null;
}): ResumeNavigation {
  return {
    id: nav.id,
    nom: nav.nom,
    date: nav.date.toISOString(),
    type: nav.type as "SOLO" | "REGATE",
    dossierId: nav.dossierId,
    aventureId: nav.aventureId,
    createdAt: nav.createdAt.toISOString(),
    trace: nav.trace
      ? {
          id: nav.trace.id,
          name: nav.trace.name,
          bateau: nav.trace.bateau,
          distanceNm: nav.trace.distanceNm,
          durationSeconds: nav.trace.durationSeconds,
          avgSpeedKn: nav.trace.avgSpeedKn,
          maxSpeedKn: nav.trace.maxSpeedKn,
          polylineSimplifiee: nav.trace.polylineSimplifiee as [number, number][] | null,
        }
      : null,
  };
}

export async function GET(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const dossier = await prisma.dossier.findFirst({
    where: { id, userId },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    const [aventures, navigationsOrphelines] = await Promise.all([
      prisma.aventure.findMany({
        where: { dossierId: id },
        orderBy: { createdAt: "desc" },
        include: {
          navigations: {
            orderBy: { date: "desc" },
            select: selectNavigation,
          },
        },
      }),
      prisma.navigation.findMany({
        where: { dossierId: id, aventureId: null },
        orderBy: { date: "desc" },
        select: selectNavigation,
      }),
    ]);

    const resultat = {
      aventures: aventures.map((a): ResumeAventure => ({
        id: a.id,
        nom: a.nom,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
        navigations: a.navigations.map(formaterNavigation),
      })),
      navigationsOrphelines: navigationsOrphelines.map(formaterNavigation),
    };

    return NextResponse.json(resultat);
  } catch (erreur) {
    journalErreur("GET /api/journal/dossiers/[id]/contenu", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/api/journal/
rtk git commit -m "$(cat <<'EOF'
feat: API dossiers — CRUD + endpoint contenu
EOF
)"
```

---

## Task 5 : API aventures (CRUD)

**Files:**
- Create: `src/app/api/journal/dossiers/[dossierId]/aventures/route.ts`
- Create: `src/app/api/journal/aventures/[id]/route.ts`

- [ ] **Step 1: Creer POST /api/journal/dossiers/[dossierId]/aventures**

Creer `src/app/api/journal/dossiers/[dossierId]/aventures/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { dossierId } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  // Verifier que le dossier appartient au user
  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, userId },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    const { nom, description } = await requete.json();
    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const aventure = await prisma.aventure.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        dossierId,
        userId,
      },
    });

    return NextResponse.json(aventure, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/dossiers/[dossierId]/aventures", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Creer PATCH + DELETE /api/journal/aventures/[id]**

Creer `src/app/api/journal/aventures/[id]/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function PATCH(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const aventure = await prisma.aventure.findFirst({
    where: { id, userId },
  });
  if (!aventure) {
    return NextResponse.json({ error: "Aventure non trouvee" }, { status: 404 });
  }

  try {
    const { nom, description } = await requete.json();
    const data: Record<string, unknown> = {};
    if (nom !== undefined) {
      if (typeof nom !== "string" || nom.trim().length === 0) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      data.nom = nom.trim();
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }

    const maj = await prisma.aventure.update({
      where: { id },
      data,
    });

    return NextResponse.json(maj);
  } catch (erreur) {
    journalErreur("PATCH /api/journal/aventures/[id]", erreur);
    return NextResponse.json({ error: "Erreur de mise a jour" }, { status: 500 });
  }
}

export async function DELETE(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const aventure = await prisma.aventure.findFirst({
    where: { id, userId },
  });
  if (!aventure) {
    return NextResponse.json({ error: "Aventure non trouvee" }, { status: 404 });
  }

  try {
    await prisma.aventure.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/journal/aventures/[id]", erreur);
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/api/journal/dossiers/*/aventures/ src/app/api/journal/aventures/
rtk git commit -m "$(cat <<'EOF'
feat: API aventures — CRUD
EOF
)"
```

---

## Task 6 : API navigations (CRUD)

**Files:**
- Create: `src/app/api/journal/navigations/route.ts`
- Create: `src/app/api/journal/navigations/[id]/route.ts`

- [ ] **Step 1: Creer POST /api/journal/navigations**

Creer `src/app/api/journal/navigations/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const { nom, date, type, dossierId, aventureId, traceId } = await requete.json();

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 });
    }
    if (!dossierId) {
      return NextResponse.json({ error: "Dossier requis" }, { status: 400 });
    }

    // Verifier que le dossier appartient au user
    const dossier = await prisma.dossier.findFirst({
      where: { id: dossierId, userId },
    });
    if (!dossier) {
      return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
    }

    // Si aventureId fourni, verifier qu'elle appartient au user et au dossier
    if (aventureId) {
      const aventure = await prisma.aventure.findFirst({
        where: { id: aventureId, userId, dossierId },
      });
      if (!aventure) {
        return NextResponse.json({ error: "Aventure non trouvee" }, { status: 404 });
      }
    }

    // Si traceId fourni, verifier qu'elle appartient au user et n'est pas deja liee
    if (traceId) {
      const trace = await prisma.trace.findFirst({
        where: { id: traceId, userId },
      });
      if (!trace) {
        return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });
      }
      const existante = await prisma.navigation.findUnique({
        where: { traceId },
      });
      if (existante) {
        return NextResponse.json({ error: "Trace deja liee a une navigation" }, { status: 409 });
      }
    }

    const typeNav = type === "REGATE" ? "REGATE" : "SOLO";

    const navigation = await prisma.navigation.create({
      data: {
        nom: nom.trim(),
        date: new Date(date),
        type: typeNav,
        userId,
        dossierId,
        aventureId: aventureId || null,
        traceId: traceId || null,
      },
    });

    return NextResponse.json(navigation, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/navigations", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Creer PATCH + DELETE /api/journal/navigations/[id]**

Creer `src/app/api/journal/navigations/[id]/route.ts` :

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function PATCH(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });
  if (!navigation) {
    return NextResponse.json({ error: "Navigation non trouvee" }, { status: 404 });
  }

  try {
    const body = await requete.json();
    const data: Record<string, unknown> = {};

    if (body.nom !== undefined) {
      if (typeof body.nom !== "string" || body.nom.trim().length === 0) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      data.nom = body.nom.trim();
    }
    if (body.date !== undefined) {
      data.date = new Date(body.date);
    }
    if (body.type !== undefined) {
      data.type = body.type === "REGATE" ? "REGATE" : "SOLO";
    }
    if (body.aventureId !== undefined) {
      if (body.aventureId) {
        const aventure = await prisma.aventure.findFirst({
          where: { id: body.aventureId, userId, dossierId: navigation.dossierId },
        });
        if (!aventure) {
          return NextResponse.json({ error: "Aventure non trouvee" }, { status: 404 });
        }
      }
      data.aventureId = body.aventureId || null;
    }
    if (body.traceId !== undefined) {
      if (body.traceId) {
        const trace = await prisma.trace.findFirst({
          where: { id: body.traceId, userId },
        });
        if (!trace) {
          return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });
        }
        const existante = await prisma.navigation.findUnique({
          where: { traceId: body.traceId },
        });
        if (existante && existante.id !== id) {
          return NextResponse.json({ error: "Trace deja liee a une navigation" }, { status: 409 });
        }
      }
      data.traceId = body.traceId || null;
    }

    const maj = await prisma.navigation.update({
      where: { id },
      data,
    });

    return NextResponse.json(maj);
  } catch (erreur) {
    journalErreur("PATCH /api/journal/navigations/[id]", erreur);
    return NextResponse.json({ error: "Erreur de mise a jour" }, { status: 500 });
  }
}

export async function DELETE(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });
  if (!navigation) {
    return NextResponse.json({ error: "Navigation non trouvee" }, { status: 404 });
  }

  try {
    await prisma.navigation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/journal/navigations/[id]", erreur);
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/api/journal/navigations/
rtk git commit -m "$(cat <<'EOF'
feat: API navigations — CRUD avec validation trace/aventure
EOF
)"
```

---

## Task 7 : Refactoring header — MenuUtilisateur dropdown

**Files:**
- Modify: `src/components/MenuUtilisateur.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Refactorer MenuUtilisateur avec Mantine Menu**

Remplacer le contenu de `src/components/MenuUtilisateur.tsx` :

```typescript
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Menu, UnstyledButton } from "@mantine/core";

export function MenuUtilisateur() {
  const routeur = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="app-header-user" />;
  }

  if (!session) {
    return (
      <div className="app-header-user">
        <div className="app-header-user-links">
          <Link href="/connexion" className="app-header-user-link">
            Connexion
          </Link>
          <Link href="/inscription" className="app-header-user-link">
            Inscription
          </Link>
        </div>
      </div>
    );
  }

  const estAdmin = session.user.role === "admin";

  return (
    <>
      <nav className="app-header-nav">
        <Link
          href="/journal"
          className={`app-header-nav-link ${pathname === "/journal" ? "active" : ""}`}
        >
          Journal
        </Link>
        {estAdmin && (
          <Link
            href="/admin"
            className={`app-header-nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}
          >
            Admin
          </Link>
        )}
      </nav>
      <div className="app-header-spacer" />
      <div className="app-header-user">
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <UnstyledButton className="app-header-user-menu-btn">
              {session.user.name} ▾
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component={Link} href="/traces">
              Mes traces
            </Menu.Item>
            <Menu.Item component={Link} href="/bateaux">
              Mes bateaux
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              onClick={async () => {
                await signOut();
                routeur.push("/");
              }}
            >
              Deconnexion
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Ajouter les styles du bouton menu dans globals.css**

Dans `src/app/globals.css`, trouver la section header et ajouter :

```css
.app-header-user-menu-btn {
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.app-header-user-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

- [ ] **Step 3: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/MenuUtilisateur.tsx src/app/globals.css
rtk git commit -m "$(cat <<'EOF'
feat: header — Journal en nav principale, Traces/Bateaux dans dropdown user
EOF
)"
```

---

## Task 8 : Composant ApercuTrace (mini-carte N&B)

**Files:**
- Create: `src/lib/geo/projection.ts`
- Create: `src/components/Journal/ApercuTrace.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Creer les utilitaires de projection Web Mercator**

Creer `src/lib/geo/projection.ts` :

```typescript
/**
 * Projection Web Mercator (EPSG:3857)
 * Convertit des coordonnees [lon, lat] en pixels pour un niveau de zoom donne.
 */

const TAILLE_TUILE = 256;

/** Convertit longitude en pixel X au zoom donne. */
export function lonEnPixel(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TAILLE_TUILE;
}

/** Convertit latitude en pixel Y au zoom donne. */
export function latEnPixel(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom) *
    TAILLE_TUILE
  );
}

/** Calcule le bounding box d'un tableau de [lon, lat]. */
export function calculerBbox(points: [number, number][]): {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
} {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLon, maxLon, minLat, maxLat };
}

/** Calcule le zoom optimal pour afficher un bbox dans une taille donnee (en pixels). */
export function calculerZoomOptimal(
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  largeur: number,
  hauteur: number
): number {
  for (let zoom = 18; zoom >= 1; zoom--) {
    const x1 = lonEnPixel(bbox.minLon, zoom);
    const x2 = lonEnPixel(bbox.maxLon, zoom);
    const y1 = latEnPixel(bbox.maxLat, zoom); // maxLat = top (y inversé)
    const y2 = latEnPixel(bbox.minLat, zoom);

    if (x2 - x1 <= largeur * 0.85 && y2 - y1 <= hauteur * 0.85) {
      return zoom;
    }
  }
  return 1;
}

/** Retourne l'URL de la tuile OSM pour des coordonnees de tuile. */
export function urlTuileOSM(x: number, y: number, z: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/** Calcule les tuiles necessaires pour couvrir un bbox a un zoom donne. */
export function tuilesNecessaires(
  bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  zoom: number
): { x: number; y: number; z: number }[] {
  const xMin = Math.floor(lonEnPixel(bbox.minLon, zoom) / TAILLE_TUILE);
  const xMax = Math.floor(lonEnPixel(bbox.maxLon, zoom) / TAILLE_TUILE);
  const yMin = Math.floor(latEnPixel(bbox.maxLat, zoom) / TAILLE_TUILE);
  const yMax = Math.floor(latEnPixel(bbox.minLat, zoom) / TAILLE_TUILE);

  const tuiles: { x: number; y: number; z: number }[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tuiles.push({ x, y, z: zoom });
    }
  }
  return tuiles;
}
```

- [ ] **Step 2: Creer le composant ApercuTrace**

Creer `src/components/Journal/ApercuTrace.tsx` :

```typescript
"use client";

import { useMemo } from "react";
import {
  calculerBbox,
  calculerZoomOptimal,
  lonEnPixel,
  latEnPixel,
  tuilesNecessaires,
  urlTuileOSM,
} from "@/lib/geo/projection";
import { COULEURS } from "@/lib/theme";

interface PropsApercuTrace {
  polylines: [number, number][][]; // Plusieurs traces possibles (aventure)
  largeur?: number;
  hauteur?: number;
}

const TAILLE_TUILE = 256;

export default function ApercuTrace({
  polylines,
  largeur = 200,
  hauteur = 140,
}: PropsApercuTrace) {
  const donnees = useMemo(() => {
    // Fusionner toutes les polylines pour le bbox
    const tousLesPoints = polylines.flat();
    if (tousLesPoints.length < 2) return null;

    const bbox = calculerBbox(tousLesPoints);
    const zoom = calculerZoomOptimal(bbox, largeur, hauteur);
    const tuiles = tuilesNecessaires(bbox, zoom);

    // Centre du bbox en pixels
    const centreX = (lonEnPixel(bbox.minLon, zoom) + lonEnPixel(bbox.maxLon, zoom)) / 2;
    const centreY = (latEnPixel(bbox.maxLat, zoom) + latEnPixel(bbox.minLat, zoom)) / 2;

    // Offset pour centrer dans le viewport
    const offsetX = largeur / 2 - centreX;
    const offsetY = hauteur / 2 - centreY;

    // Positionner les tuiles
    const tuilesPositionnees = tuiles.map((t) => ({
      url: urlTuileOSM(t.x, t.y, t.z),
      left: t.x * TAILLE_TUILE + offsetX,
      top: t.y * TAILLE_TUILE + offsetY,
    }));

    // Projeter les polylines en pixels
    const polylinesPixels = polylines.map((poly) =>
      poly.map(([lon, lat]) => ({
        x: lonEnPixel(lon, zoom) + offsetX,
        y: latEnPixel(lat, zoom) + offsetY,
      }))
    );

    return { tuilesPositionnees, polylinesPixels };
  }, [polylines, largeur, hauteur]);

  if (!donnees) {
    return (
      <div
        className="apercu-trace apercu-trace-vide"
        style={{ width: largeur, height: hauteur }}
      >
        Aucune trace
      </div>
    );
  }

  return (
    <div
      className="apercu-trace"
      style={{ width: largeur, height: hauteur }}
    >
      {/* Tuiles de fond */}
      {donnees.tuilesPositionnees.map((tuile, i) => (
        <img
          key={i}
          src={tuile.url}
          alt=""
          className="apercu-trace-tuile"
          style={{ left: tuile.left, top: tuile.top }}
          loading="lazy"
        />
      ))}
      {/* Traces en SVG */}
      <svg
        className="apercu-trace-svg"
        width={largeur}
        height={hauteur}
        viewBox={`0 0 ${largeur} ${hauteur}`}
      >
        {donnees.polylinesPixels.map((points, i) => (
          <polyline
            key={i}
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={COULEURS.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Ajouter les styles dans globals.css**

Ajouter dans `src/app/globals.css` :

```css
/* =============================================
   APERCU TRACE (mini-carte N&B)
   ============================================= */

.apercu-trace {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: #333;
}

.apercu-trace-vide {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  font-size: 0.75rem;
}

.apercu-trace-tuile {
  position: absolute;
  width: 256px;
  height: 256px;
  filter: grayscale(1) contrast(0.7);
  pointer-events: none;
}

.apercu-trace-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
```

- [ ] **Step 4: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/geo/projection.ts src/components/Journal/ApercuTrace.tsx src/app/globals.css
rtk git commit -m "$(cat <<'EOF'
feat: ApercuTrace — mini-carte N&B avec tuiles OSM + SVG overlay
EOF
)"
```

---

## Task 9 : Composant PanneauApercu

**Files:**
- Create: `src/components/Journal/PanneauApercu.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Creer le composant PanneauApercu**

Creer `src/components/Journal/PanneauApercu.tsx` :

```typescript
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
    day: "numeric",
    month: "long",
    year: "numeric",
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
              <dt>Temps sur l'eau</dt>
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
      if (nav.trace?.polylineSimplifiee) {
        polys.push(nav.trace.polylineSimplifiee);
      }
      if (nav.trace?.distanceNm) dist += nav.trace.distanceNm;
      if (nav.trace?.durationSeconds) duree += nav.trace.durationSeconds;
      if (!premier || nav.date < premier) premier = nav.date;
    }

    return {
      polylines: polys,
      distanceTotale: dist,
      dureeTotale: duree,
      nbNavs: aventure.navigations.length,
      premierDepart: premier,
    };
  }, [aventure.navigations]);

  const dateFormatee = premierDepart
    ? new Date(premierDepart).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
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
              <dt>Temps sur l'eau</dt>
              <dd>{formaterDuree(dureeTotale)}</dd>
            </div>
          )}
        </dl>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Ajouter les styles du panneau dans globals.css**

Ajouter dans `src/app/globals.css` :

```css
/* =============================================
   PANNEAU APERCU (sidebar journal)
   ============================================= */

.panneau-apercu {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  align-self: flex-start;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: opacity 0.15s ease;
}

.panneau-apercu-vide {
  border: none;
  background: none;
}

.panneau-apercu-no-trace {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--border-light);
  color: var(--text-light);
  font-size: 0.875rem;
}

.panneau-apercu-infos {
  padding: 16px;
}

.panneau-apercu-titre {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--foreground);
}

.panneau-apercu-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panneau-apercu-stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.panneau-apercu-stat dt {
  color: var(--text-secondary);
}

.panneau-apercu-stat dd {
  font-weight: 500;
  color: var(--foreground);
}
```

- [ ] **Step 3: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/Journal/PanneauApercu.tsx src/app/globals.css
rtk git commit -m "$(cat <<'EOF'
feat: PanneauApercu — panneau lateral avec mini-carte et stats au survol
EOF
)"
```

---

## Task 10 : Composants Journal (cartes + modale)

**Files:**
- Create: `src/components/Journal/CarteDossier.tsx`
- Create: `src/components/Journal/CarteAventure.tsx`
- Create: `src/components/Journal/CarteNavigation.tsx`
- Create: `src/components/Journal/ContenuDossier.tsx`
- Create: `src/components/Journal/ModaleElement.tsx`
- Create: `src/components/Journal/BarreActionsJournal.tsx`
- Modify: `src/app/globals.css`

Cette task est plus grosse. Les composants sont simples mais nombreux.

- [ ] **Step 1: Creer CarteNavigation**

Creer `src/components/Journal/CarteNavigation.tsx` :

```typescript
"use client";

import type { ResumeNavigation } from "@/lib/types";

interface PropsCarteNavigation {
  navigation: ResumeNavigation;
  onSurvol: (nav: ResumeNavigation | null) => void;
  onEditer: (nav: ResumeNavigation) => void;
  onSupprimer: (id: string) => void;
}

export default function CarteNavigation({
  navigation,
  onSurvol,
  onEditer,
  onSupprimer,
}: PropsCarteNavigation) {
  const dateFormatee = new Date(navigation.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="carte-navigation"
      onMouseEnter={() => onSurvol(navigation)}
      onMouseLeave={() => onSurvol(null)}
    >
      <div className="carte-navigation-contenu">
        <div className="carte-navigation-header">
          <span className="carte-navigation-nom">{navigation.nom}</span>
          <span className="carte-navigation-date">{dateFormatee}</span>
        </div>
        <div className="carte-navigation-badges">
          <span
            className={`badge-type ${navigation.type === "REGATE" ? "badge-type-regate" : "badge-type-solo"}`}
          >
            {navigation.type === "REGATE" ? "Regate" : "Solo"}
          </span>
          {navigation.trace?.bateau && (
            <span className="badge-bateau">{navigation.trace.bateau.nom}</span>
          )}
          {navigation.trace ? (
            <span className="badge-trace">
              {navigation.trace.distanceNm?.toFixed(1)} NM
            </span>
          ) : (
            <span className="badge-trace-vide">Aucune trace</span>
          )}
        </div>
      </div>
      <div className="carte-navigation-actions">
        <button
          className="btn-menu-contextuel"
          onClick={(e) => {
            e.stopPropagation();
            onEditer(navigation);
          }}
          title="Modifier"
        >
          ✎
        </button>
        <button
          className="btn-menu-contextuel btn-menu-contextuel-danger"
          onClick={(e) => {
            e.stopPropagation();
            onSupprimer(navigation.id);
          }}
          title="Supprimer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Creer CarteAventure**

Creer `src/components/Journal/CarteAventure.tsx` :

```typescript
"use client";

import { useState } from "react";
import type { ResumeAventure, ResumeNavigation } from "@/lib/types";
import CarteNavigation from "./CarteNavigation";

interface PropsCarteAventure {
  aventure: ResumeAventure;
  onSurvolAventure: (aventure: ResumeAventure | null) => void;
  onSurvolNavigation: (nav: ResumeNavigation | null) => void;
  onEditerAventure: (aventure: ResumeAventure) => void;
  onSupprimerAventure: (id: string) => void;
  onAjouterNavigation: (aventureId: string) => void;
  onEditerNavigation: (nav: ResumeNavigation) => void;
  onSupprimerNavigation: (id: string) => void;
}

export default function CarteAventure({
  aventure,
  onSurvolAventure,
  onSurvolNavigation,
  onEditerAventure,
  onSupprimerAventure,
  onAjouterNavigation,
  onEditerNavigation,
  onSupprimerNavigation,
}: PropsCarteAventure) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="carte-aventure">
      <div
        className="carte-aventure-header"
        onClick={() => setOuvert(!ouvert)}
        onMouseEnter={() => onSurvolAventure(aventure)}
        onMouseLeave={() => onSurvolAventure(null)}
      >
        <div className="carte-aventure-info">
          <span className="carte-aventure-chevron">{ouvert ? "▾" : "▸"}</span>
          <span className="carte-aventure-nom">{aventure.nom}</span>
          <span className="carte-aventure-count">
            {aventure.navigations.length} nav{aventure.navigations.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="carte-aventure-actions">
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onAjouterNavigation(aventure.id);
            }}
            title="Ajouter une navigation"
          >
            +
          </button>
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onEditerAventure(aventure);
            }}
            title="Modifier"
          >
            ✎
          </button>
          <button
            className="btn-menu-contextuel btn-menu-contextuel-danger"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimerAventure(aventure.id);
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
      {ouvert && (
        <div className="carte-aventure-contenu">
          {aventure.navigations.length === 0 ? (
            <p className="carte-aventure-vide">Aucune navigation</p>
          ) : (
            aventure.navigations.map((nav) => (
              <CarteNavigation
                key={nav.id}
                navigation={nav}
                onSurvol={onSurvolNavigation}
                onEditer={onEditerNavigation}
                onSupprimer={onSupprimerNavigation}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Creer ContenuDossier**

Creer `src/components/Journal/ContenuDossier.tsx` :

```typescript
"use client";

import type { ContenuDossier as TypeContenu, ResumeAventure, ResumeNavigation } from "@/lib/types";
import CarteAventure from "./CarteAventure";
import CarteNavigation from "./CarteNavigation";

interface PropsContenuDossier {
  contenu: TypeContenu;
  dossierId: string;
  onSurvolAventure: (aventure: ResumeAventure | null) => void;
  onSurvolNavigation: (nav: ResumeNavigation | null) => void;
  onAjouterAventure: () => void;
  onAjouterNavigation: (aventureId: string | null) => void;
  onEditerAventure: (aventure: ResumeAventure) => void;
  onSupprimerAventure: (id: string) => void;
  onEditerNavigation: (nav: ResumeNavigation) => void;
  onSupprimerNavigation: (id: string) => void;
}

export default function ContenuDossier({
  contenu,
  dossierId,
  onSurvolAventure,
  onSurvolNavigation,
  onAjouterAventure,
  onAjouterNavigation,
  onEditerAventure,
  onSupprimerAventure,
  onEditerNavigation,
  onSupprimerNavigation,
}: PropsContenuDossier) {
  const aucunContenu =
    contenu.aventures.length === 0 && contenu.navigationsOrphelines.length === 0;

  return (
    <div className="contenu-dossier">
      <div className="contenu-dossier-actions">
        <button className="btn-secondaire" onClick={onAjouterAventure}>
          + Aventure
        </button>
        <button className="btn-secondaire" onClick={() => onAjouterNavigation(null)}>
          + Navigation
        </button>
      </div>

      {aucunContenu && (
        <p className="contenu-dossier-vide">
          Ce dossier est vide. Ajoutez une aventure ou une navigation.
        </p>
      )}

      {contenu.aventures.map((aventure) => (
        <CarteAventure
          key={aventure.id}
          aventure={aventure}
          onSurvolAventure={onSurvolAventure}
          onSurvolNavigation={onSurvolNavigation}
          onEditerAventure={onEditerAventure}
          onSupprimerAventure={onSupprimerAventure}
          onAjouterNavigation={onAjouterNavigation}
          onEditerNavigation={onEditerNavigation}
          onSupprimerNavigation={onSupprimerNavigation}
        />
      ))}

      {contenu.navigationsOrphelines.length > 0 && (
        <div className="contenu-dossier-orphelines">
          {contenu.aventures.length > 0 && (
            <h4 className="contenu-dossier-section-titre">Navigations</h4>
          )}
          {contenu.navigationsOrphelines.map((nav) => (
            <CarteNavigation
              key={nav.id}
              navigation={nav}
              onSurvol={onSurvolNavigation}
              onEditer={onEditerNavigation}
              onSupprimer={onSupprimerNavigation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Creer CarteDossier**

Creer `src/components/Journal/CarteDossier.tsx` :

```typescript
"use client";

import type { ResumeDossier } from "@/lib/types";

interface PropsCarteDossier {
  dossier: ResumeDossier;
  ouvert: boolean;
  onToggle: () => void;
  onEditer: (dossier: ResumeDossier) => void;
  onSupprimer: (id: string) => void;
  children?: React.ReactNode;
}

export default function CarteDossier({
  dossier,
  ouvert,
  onToggle,
  onEditer,
  onSupprimer,
  children,
}: PropsCarteDossier) {
  return (
    <div className={`carte-dossier ${ouvert ? "carte-dossier-ouvert" : ""}`}>
      <div className="carte-dossier-header" onClick={onToggle}>
        <div className="carte-dossier-info">
          <span className="carte-dossier-chevron">{ouvert ? "▾" : "▸"}</span>
          <div>
            <h3 className="carte-dossier-nom">{dossier.nom}</h3>
            {dossier.description && (
              <p className="carte-dossier-description">{dossier.description}</p>
            )}
            <span className="carte-dossier-compteurs">
              {dossier.nbAventures > 0 &&
                `${dossier.nbAventures} aventure${dossier.nbAventures > 1 ? "s" : ""}`}
              {dossier.nbAventures > 0 && dossier.nbNavigations > 0 && " · "}
              {dossier.nbNavigations > 0 &&
                `${dossier.nbNavigations} navigation${dossier.nbNavigations > 1 ? "s" : ""}`}
              {dossier.nbAventures === 0 && dossier.nbNavigations === 0 && "Vide"}
            </span>
          </div>
        </div>
        <div className="carte-dossier-actions">
          <button
            className="btn-menu-contextuel"
            onClick={(e) => {
              e.stopPropagation();
              onEditer(dossier);
            }}
            title="Modifier"
          >
            ✎
          </button>
          <button
            className="btn-menu-contextuel btn-menu-contextuel-danger"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimer(dossier.id);
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
      {ouvert && <div className="carte-dossier-contenu">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Creer ModaleElement**

Creer `src/components/Journal/ModaleElement.tsx` :

```typescript
"use client";

import { useState, useEffect } from "react";
import { Modal, TextInput, Textarea, Select, NativeSelect } from "@mantine/core";
import type { ResumeTrace } from "@/lib/types";

type TypeModale = "dossier" | "aventure" | "navigation";

interface PropsModaleElement {
  ouvert: boolean;
  onFermer: () => void;
  onValider: (donnees: Record<string, unknown>) => void;
  type: TypeModale;
  edition?: Record<string, unknown> | null; // Donnees existantes si edition
  dossierId?: string;
  aventureId?: string | null;
  tracesDisponibles?: ResumeTrace[];
}

export default function ModaleElement({
  ouvert,
  onFermer,
  onValider,
  type,
  edition,
  dossierId,
  aventureId,
  tracesDisponibles = [],
}: PropsModaleElement) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [typeNav, setTypeNav] = useState("SOLO");
  const [traceId, setTraceId] = useState("");

  useEffect(() => {
    if (edition) {
      setNom((edition.nom as string) || "");
      setDescription((edition.description as string) || "");
      if (edition.date) setDate((edition.date as string).slice(0, 10));
      if (edition.type) setTypeNav(edition.type as string);
      if (edition.traceId) setTraceId(edition.traceId as string);
    } else {
      setNom("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setTypeNav("SOLO");
      setTraceId("");
    }
  }, [edition, ouvert]);

  const titres: Record<TypeModale, string> = {
    dossier: edition ? "Modifier le dossier" : "Nouveau dossier",
    aventure: edition ? "Modifier l'aventure" : "Nouvelle aventure",
    navigation: edition ? "Modifier la navigation" : "Nouvelle navigation",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    const donnees: Record<string, unknown> = { nom: nom.trim() };

    if (type === "dossier" || type === "aventure") {
      donnees.description = description.trim() || null;
    }

    if (type === "navigation") {
      donnees.date = date;
      donnees.type = typeNav;
      donnees.dossierId = dossierId;
      donnees.aventureId = aventureId || null;
      if (traceId) donnees.traceId = traceId;
    }

    onValider(donnees);
  };

  return (
    <Modal opened={ouvert} onClose={onFermer} title={titres[type]} centered>
      <form onSubmit={handleSubmit} className="modale-form">
        <TextInput
          label="Nom"
          value={nom}
          onChange={(e) => setNom(e.currentTarget.value)}
          required
          autoFocus
        />

        {(type === "dossier" || type === "aventure") && (
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
        )}

        {type === "navigation" && (
          <>
            <TextInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
              required
            />
            <NativeSelect
              label="Type"
              value={typeNav}
              onChange={(e) => setTypeNav(e.currentTarget.value)}
              data={[
                { value: "SOLO", label: "Solo" },
                { value: "REGATE", label: "Regate" },
              ]}
            />
            {(() => {
              // En edition, inclure la trace actuellement liee si elle n'est pas dans les disponibles
              const traceActuelle = edition?.trace as { id: string; name: string; distanceNm?: number | null } | undefined;
              const options = tracesDisponibles.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.distanceNm?.toFixed(1) ?? "?"} NM)`,
              }));
              if (traceActuelle && !options.find((o) => o.value === traceActuelle.id)) {
                options.unshift({
                  value: traceActuelle.id,
                  label: `${traceActuelle.name} (${traceActuelle.distanceNm?.toFixed(1) ?? "?"} NM)`,
                });
              }
              return options.length > 0 ? (
                <Select
                  label="Trace"
                  placeholder="Aucune trace"
                  value={traceId || null}
                  onChange={(val) => setTraceId(val || "")}
                  data={options}
                  clearable
                  searchable
                />
              ) : null;
            })()}
          </>
        )}

        <div className="modale-form-actions">
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="btn-principal">
            {edition ? "Enregistrer" : "Creer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 6: Creer BarreActionsJournal**

Creer `src/components/Journal/BarreActionsJournal.tsx` :

```typescript
"use client";

import { NativeSelect } from "@mantine/core";
import type { ResumeBateau } from "@/lib/types";

interface PropsBarreActions {
  onNouveauDossier: () => void;
  bateaux: ResumeBateau[];
  filtreBateau: string;
  onFiltreBateau: (valeur: string) => void;
  filtreType: string;
  onFiltreType: (valeur: string) => void;
}

export default function BarreActionsJournal({
  onNouveauDossier,
  bateaux,
  filtreBateau,
  onFiltreBateau,
  filtreType,
  onFiltreType,
}: PropsBarreActions) {
  return (
    <div className="barre-actions-journal">
      <button className="btn-principal" onClick={onNouveauDossier}>
        + Nouveau dossier
      </button>
      <div className="barre-actions-filtres">
        <NativeSelect
          value={filtreBateau}
          onChange={(e) => onFiltreBateau(e.currentTarget.value)}
          data={[
            { value: "tous", label: "Tous les bateaux" },
            ...bateaux.map((b) => ({ value: b.id, label: b.nom })),
          ]}
          size="xs"
        />
        <NativeSelect
          value={filtreType}
          onChange={(e) => onFiltreType(e.currentTarget.value)}
          data={[
            { value: "tous", label: "Tous les types" },
            { value: "SOLO", label: "Solo" },
            { value: "REGATE", label: "Regate" },
          ]}
          size="xs"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Ajouter tous les styles journal dans globals.css**

Ajouter dans `src/app/globals.css` :

```css
/* =============================================
   JOURNAL — CARTES & LAYOUT
   ============================================= */

.journal-layout {
  display: flex;
  gap: 24px;
  max-width: 72rem;
  margin: 0 auto;
  padding: 24px;
}

.journal-contenu {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Barre d'actions */
.barre-actions-journal {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.barre-actions-filtres {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* Carte dossier */
.carte-dossier {
  background: white;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent-yellow);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.15s;
}

.carte-dossier:hover {
  border-color: var(--accent);
  border-left-color: var(--accent-yellow);
}

.carte-dossier-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  gap: 16px;
}

.carte-dossier-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.carte-dossier-chevron {
  color: var(--text-secondary);
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.carte-dossier-nom {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.carte-dossier-description {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.carte-dossier-compteurs {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-top: 4px;
  display: block;
}

.carte-dossier-contenu {
  padding: 0 16px 16px 24px;
  animation: deplier 0.15s ease;
}

@keyframes deplier {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.carte-dossier-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.carte-dossier:hover .carte-dossier-actions {
  opacity: 1;
}

/* Carte aventure */
.carte-aventure {
  background: white;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
}

.carte-aventure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  gap: 12px;
}

.carte-aventure-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.carte-aventure-chevron {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.carte-aventure-nom {
  font-weight: 500;
  font-size: 0.9375rem;
}

.carte-aventure-count {
  font-size: 0.75rem;
  color: var(--text-light);
}

.carte-aventure-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.carte-aventure:hover > .carte-aventure-header > .carte-aventure-actions {
  opacity: 1;
}

.carte-aventure-contenu {
  padding: 4px 12px 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: deplier 0.15s ease;
}

.carte-aventure-vide {
  font-size: 0.8125rem;
  color: var(--text-light);
  padding: 8px 0;
}

/* Carte navigation */
.carte-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s;
  gap: 12px;
}

.carte-navigation:hover {
  border-color: var(--accent);
}

.carte-navigation-contenu {
  flex: 1;
  min-width: 0;
}

.carte-navigation-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.carte-navigation-nom {
  font-weight: 500;
  font-size: 0.875rem;
}

.carte-navigation-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.carte-navigation-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge-type {
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 500;
}

.badge-type-solo {
  background: var(--border);
  color: var(--text-secondary);
}

.badge-type-regate {
  background: var(--accent-yellow-light);
  color: var(--accent-yellow-dark);
}

.badge-bateau {
  font-size: 0.6875rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--accent-light);
  color: var(--accent);
}

.badge-trace {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.badge-trace-vide {
  font-size: 0.6875rem;
  color: var(--text-light);
  font-style: italic;
}

.carte-navigation-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.carte-navigation:hover .carte-navigation-actions {
  opacity: 1;
}

/* Contenu dossier */
.contenu-dossier {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contenu-dossier-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.contenu-dossier-vide {
  font-size: 0.8125rem;
  color: var(--text-light);
  text-align: center;
  padding: 16px 0;
}

.contenu-dossier-section-titre {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-light);
  margin-top: 8px;
}

/* Boutons communs */
.btn-principal {
  background: var(--accent);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-principal:hover {
  background: var(--accent-dark);
}

.btn-secondaire {
  background: none;
  color: var(--accent);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s;
}

.btn-secondaire:hover {
  border-color: var(--accent);
}

.btn-menu-contextuel {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 4px;
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
  font-family: inherit;
}

.btn-menu-contextuel:hover {
  color: var(--accent);
  background: var(--accent-light);
}

.btn-menu-contextuel-danger:hover {
  color: var(--danger);
  background: #fef2f2;
}

/* Modale */
.modale-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modale-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* Etat vide journal */
.journal-vide {
  text-align: center;
  padding: 64px 0;
}

.journal-vide-icone {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  opacity: 0.4;
  color: var(--text-light);
}

.journal-vide-texte {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}
```

- [ ] **Step 8: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 9: Commit**

```bash
rtk git add src/components/Journal/CarteDossier.tsx src/components/Journal/CarteAventure.tsx src/components/Journal/CarteNavigation.tsx src/components/Journal/ContenuDossier.tsx src/components/Journal/ModaleElement.tsx src/components/Journal/BarreActionsJournal.tsx src/app/globals.css
rtk git commit -m "$(cat <<'EOF'
feat: composants Journal — cartes dossier/aventure/navigation + modale + barre actions
EOF
)"
```

---

## Task 11 : PageJournal (client component principal)

**Files:**
- Create: `src/components/Journal/PageJournal.tsx`

- [ ] **Step 1: Creer le composant PageJournal**

Creer `src/components/Journal/PageJournal.tsx` :

```typescript
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  ResumeDossier,
  ResumeBateau,
  ResumeTrace,
  ResumeAventure,
  ResumeNavigation,
  ContenuDossier,
} from "@/lib/types";
import BarreActionsJournal from "./BarreActionsJournal";
import CarteDossier from "./CarteDossier";
import ContenuDossierComp from "./ContenuDossier";
import PanneauApercu from "./PanneauApercu";
import ModaleElement from "./ModaleElement";

interface PropsPageJournal {
  dossiers: ResumeDossier[];
  bateaux: ResumeBateau[];
  tracesDisponibles: ResumeTrace[];
}

type ElementSurvole =
  | { type: "aventure"; element: ResumeAventure }
  | { type: "navigation"; element: ResumeNavigation }
  | { type: null };

type ModaleConfig = {
  ouvert: boolean;
  type: "dossier" | "aventure" | "navigation";
  edition: Record<string, unknown> | null;
  dossierId?: string;
  aventureId?: string | null;
};

export default function PageJournal({
  dossiers: dossiersInitiaux,
  bateaux,
  tracesDisponibles,
}: PropsPageJournal) {
  const routeur = useRouter();
  const [dossiersOuverts, setDossiersOuverts] = useState<Set<string>>(new Set());
  const [cacheContenu, setCacheContenu] = useState<Map<string, ContenuDossier>>(new Map());
  const [chargement, setChargement] = useState<Set<string>>(new Set());
  const [survol, setSurvol] = useState<ElementSurvole>({ type: null });
  const [filtreBateau, setFiltreBateau] = useState("tous");
  const [filtreType, setFiltreType] = useState("tous");
  const [modale, setModale] = useState<ModaleConfig>({
    ouvert: false,
    type: "dossier",
    edition: null,
  });

  // Toggle dossier ouvert/ferme
  const toggleDossier = useCallback(
    async (dossierId: string) => {
      const nouveau = new Set(dossiersOuverts);
      if (nouveau.has(dossierId)) {
        nouveau.delete(dossierId);
        setDossiersOuverts(nouveau);
        return;
      }

      nouveau.add(dossierId);
      setDossiersOuverts(nouveau);

      // Charger le contenu si pas en cache
      if (!cacheContenu.has(dossierId)) {
        setChargement((prev) => new Set(prev).add(dossierId));
        try {
          const res = await fetch(`/api/journal/dossiers/${dossierId}/contenu`);
          if (res.ok) {
            const contenu: ContenuDossier = await res.json();
            setCacheContenu((prev) => new Map(prev).set(dossierId, contenu));
          }
        } finally {
          setChargement((prev) => {
            const s = new Set(prev);
            s.delete(dossierId);
            return s;
          });
        }
      }
    },
    [dossiersOuverts, cacheContenu]
  );

  // Invalider le cache d'un dossier (apres mutation)
  const invaliderCache = useCallback(
    async (dossierId: string) => {
      try {
        const res = await fetch(`/api/journal/dossiers/${dossierId}/contenu`);
        if (res.ok) {
          const contenu: ContenuDossier = await res.json();
          setCacheContenu((prev) => new Map(prev).set(dossierId, contenu));
        }
      } catch {
        // Silently fail
      }
    },
    []
  );

  // CRUD handlers
  const handleValiderModale = useCallback(
    async (donnees: Record<string, unknown>) => {
      const { type, edition, dossierId } = modale;

      try {
        if (type === "dossier") {
          if (edition) {
            await fetch(`/api/journal/dossiers/${(edition as { id: string }).id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else {
            await fetch("/api/journal/dossiers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
          routeur.refresh();
        } else if (type === "aventure") {
          if (edition) {
            await fetch(`/api/journal/aventures/${(edition as { id: string }).id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else if (dossierId) {
            await fetch(`/api/journal/dossiers/${dossierId}/aventures`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
          if (dossierId) await invaliderCache(dossierId);
          routeur.refresh();
        } else if (type === "navigation") {
          if (edition) {
            await fetch(`/api/journal/navigations/${(edition as { id: string }).id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          } else {
            await fetch("/api/journal/navigations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(donnees),
            });
          }
          const did = (donnees.dossierId || dossierId) as string;
          if (did) await invaliderCache(did);
          routeur.refresh();
        }
      } catch {
        // TODO: afficher erreur
      }

      setModale({ ouvert: false, type: "dossier", edition: null });
    },
    [modale, routeur, invaliderCache]
  );

  const handleSupprimer = useCallback(
    async (type: "dossier" | "aventure" | "navigation", id: string, dossierId?: string) => {
      const messages: Record<string, string> = {
        dossier: "Supprimer ce dossier et tout son contenu (aventures, navigations) ?",
        aventure: "Supprimer cette aventure et ses navigations ?",
        navigation: "Supprimer cette navigation ?",
      };
      if (!window.confirm(messages[type])) return;

      const urls: Record<string, string> = {
        dossier: `/api/journal/dossiers/${id}`,
        aventure: `/api/journal/aventures/${id}`,
        navigation: `/api/journal/navigations/${id}`,
      };

      try {
        await fetch(urls[type], { method: "DELETE" });
        if (dossierId) await invaliderCache(dossierId);
        routeur.refresh();
      } catch {
        // TODO: afficher erreur
      }
    },
    [routeur, invaliderCache]
  );

  // Filtrage du contenu des dossiers ouverts
  const filtrerContenu = useCallback(
    (contenu: ContenuDossier): ContenuDossier => {
      if (filtreBateau === "tous" && filtreType === "tous") return contenu;

      const filtrerNav = (nav: ResumeNavigation) => {
        if (filtreType !== "tous" && nav.type !== filtreType) return false;
        if (filtreBateau !== "tous" && nav.trace?.bateau?.id !== filtreBateau) return false;
        return true;
      };

      return {
        aventures: contenu.aventures
          .map((a) => ({ ...a, navigations: a.navigations.filter(filtrerNav) }))
          .filter((a) => a.navigations.length > 0),
        navigationsOrphelines: contenu.navigationsOrphelines.filter(filtrerNav),
      };
    },
    [filtreBateau, filtreType]
  );

  return (
    <div className="journal-layout">
      <div className="journal-contenu">
        <BarreActionsJournal
          onNouveauDossier={() =>
            setModale({ ouvert: true, type: "dossier", edition: null })
          }
          bateaux={bateaux}
          filtreBateau={filtreBateau}
          onFiltreBateau={setFiltreBateau}
          filtreType={filtreType}
          onFiltreType={setFiltreType}
        />

        {dossiersInitiaux.length === 0 ? (
          <div className="journal-vide">
            <div className="journal-vide-icone">📒</div>
            <p className="journal-vide-texte">
              Creez votre premier dossier pour organiser vos navigations.
            </p>
          </div>
        ) : (
          dossiersInitiaux.map((dossier) => {
            const estOuvert = dossiersOuverts.has(dossier.id);
            const contenu = cacheContenu.get(dossier.id);
            const enChargement = chargement.has(dossier.id);

            return (
              <CarteDossier
                key={dossier.id}
                dossier={dossier}
                ouvert={estOuvert}
                onToggle={() => toggleDossier(dossier.id)}
                onEditer={(d) =>
                  setModale({ ouvert: true, type: "dossier", edition: d })
                }
                onSupprimer={(id) => handleSupprimer("dossier", id)}
              >
                {enChargement && (
                  <p style={{ color: "var(--text-light)", fontSize: "0.8125rem" }}>
                    Chargement...
                  </p>
                )}
                {contenu && (
                  <ContenuDossierComp
                    contenu={filtrerContenu(contenu)}
                    dossierId={dossier.id}
                    onSurvolAventure={(a) =>
                      setSurvol(a ? { type: "aventure", element: a } : { type: null })
                    }
                    onSurvolNavigation={(n) =>
                      setSurvol(n ? { type: "navigation", element: n } : { type: null })
                    }
                    onAjouterAventure={() =>
                      setModale({
                        ouvert: true,
                        type: "aventure",
                        edition: null,
                        dossierId: dossier.id,
                      })
                    }
                    onAjouterNavigation={(aventureId) =>
                      setModale({
                        ouvert: true,
                        type: "navigation",
                        edition: null,
                        dossierId: dossier.id,
                        aventureId,
                      })
                    }
                    onEditerAventure={(a) =>
                      setModale({
                        ouvert: true,
                        type: "aventure",
                        edition: a,
                        dossierId: dossier.id,
                      })
                    }
                    onSupprimerAventure={(id) =>
                      handleSupprimer("aventure", id, dossier.id)
                    }
                    onEditerNavigation={(n) =>
                      setModale({
                        ouvert: true,
                        type: "navigation",
                        edition: { ...n, traceId: n.trace?.id ?? null },
                        dossierId: dossier.id,
                        aventureId: n.aventureId,
                      })
                    }
                    onSupprimerNavigation={(id) =>
                      handleSupprimer("navigation", id, dossier.id)
                    }
                  />
                )}
              </CarteDossier>
            );
          })
        )}

        {(filtreBateau !== "tous" || filtreType !== "tous") && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-light)", textAlign: "center" }}>
            Les filtres s'appliquent uniquement aux dossiers deplies.
          </p>
        )}
      </div>

      <PanneauApercu {...survol} />

      <ModaleElement
        ouvert={modale.ouvert}
        onFermer={() => setModale({ ouvert: false, type: "dossier", edition: null })}
        onValider={handleValiderModale}
        type={modale.type}
        edition={modale.edition}
        dossierId={modale.dossierId}
        aventureId={modale.aventureId}
        tracesDisponibles={tracesDisponibles}
        bateaux={bateaux}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/Journal/PageJournal.tsx
rtk git commit -m "$(cat <<'EOF'
feat: PageJournal — composant principal avec CRUD, filtres et survol
EOF
)"
```

---

## Task 12 : Page server component /journal

**Files:**
- Create: `src/app/journal/page.tsx`

- [ ] **Step 1: Creer la page /journal**

Creer `src/app/journal/page.tsx` :

```typescript
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
        include: {
          _count: { select: { aventures: true, navigations: true } },
        },
      }),
      prisma.bateau.findMany({
        where: { userId },
        orderBy: { nom: "asc" },
      }),
      // Traces non liees a une navigation (disponibles pour association)
      prisma.trace.findMany({
        where: {
          userId,
          navigation: null,
        },
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
          bateauId: true,
          bateau: { select: { id: true, nom: true } },
        },
      }),
    ]);

    dossiers = resultDossiers.map((d) => ({
      id: d.id,
      nom: d.nom,
      description: d.description,
      nbAventures: d._count.aventures,
      nbNavigations: d._count.navigations,
      createdAt: d.createdAt.toISOString(),
    }));

    bateaux = resultBateaux.map((b) => ({
      id: b.id,
      nom: b.nom,
      classe: b.classe,
      longueur: b.longueur,
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
      <PageJournal
        dossiers={dossiers}
        bateaux={bateaux}
        tracesDisponibles={tracesDisponibles}
      />
    </>
  );
}
```

- [ ] **Step 2: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 3: Tester manuellement**

Run: `npm run dev`
Naviguer vers `http://localhost:3000/journal` :
- La page se charge sans erreur
- Le bouton "Nouveau dossier" ouvre la modale
- Creer un dossier → il apparait dans la liste
- Deployer le dossier → les boutons "+ Aventure" et "+ Navigation" apparaissent
- Le panneau d'apercu est vide par defaut
- Le header montre "Journal" a la place de "Traces | Bateaux"
- Le dropdown utilisateur contient "Mes traces", "Mes bateaux", "Deconnexion"

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/journal/
rtk git commit -m "$(cat <<'EOF'
feat: page /journal — server component avec chargement dossiers, bateaux, traces
EOF
)"
```

---

## Task 13 : Mise a jour de la landing page et ROADMAP

**Files:**
- Modify: `src/app/page.tsx` (redirect vers /journal si connecte au lieu de /traces)
- Modify: `ROADMAP.md` (split Phase 3 en 3a/3b/3c)
- Modify: `CHANGELOG.md` (ajouter v0.4.0 Phase 3a)

- [ ] **Step 1: Mettre a jour la redirection de la page d'accueil**

Dans `src/app/page.tsx`, changer la redirection de `/traces` vers `/journal` pour les utilisateurs connectes.

Trouver la ligne qui redirige vers `/traces` et la remplacer par `/journal`.

- [ ] **Step 2: Mettre a jour ROADMAP.md**

Remplacer la section Phase 3 par :

```markdown
## Phase 3a — Journal : dossiers & navigations (v0.4)

- [x] Page journal `/journal` : cartes depliables (approche hybride)
- [x] Hierarchie Dossier → Aventure (optionnelle) → Navigation
- [x] CRUD dossiers, aventures, navigations
- [x] Association navigation → trace (1:1)
- [x] Panneau d'apercu lateral (mini-carte + stats au survol)
- [x] Mini-carte N&B (tuiles OSM + SVG, sans MapLibre)
- [x] Filtrage par bateau, type (solo/regate) dans les dossiers deplies
- [x] Header reorganise : Journal en nav principale, Traces/Bateaux dans dropdown user
- [x] Polyline simplifiee calculee a l'import (RDP)

## Phase 3b — Vue navigation immersive (v0.4.x)

- [ ] Vue navigation : carte + timeline + replay anime (play/pause/vitesse)
- [ ] Curseur synchronise graphique ↔ carte
- [ ] Mode edition post-nav

## Phase 3c — Entrees journal (v0.4.x)

- [ ] Entrees journal : notes texte + photos geolocalisees
- [ ] Storage photos : Railway Storage Buckets (S3-compatible)
```

- [ ] **Step 3: Ajouter l'entree changelog**

Ajouter en haut de `CHANGELOG.md` :

```markdown
## v0.4.0 — Phase 3a : Journal — dossiers & navigations (2026-03-XX)

### Journal de bord
- Page `/journal` : organisation en dossiers, aventures et navigations
- Hierarchie Dossier → Aventure (optionnelle) → Navigation
- CRUD complet avec modales (creer, editer, supprimer)
- Association navigation → trace depuis la bibliotheque
- Panneau d'apercu lateral : mini-carte N&B + statistiques au survol
- Filtrage par bateau et type (solo/regate) dans les dossiers deplies

### Mini-carte d'apercu
- Tuiles OSM raster en noir & blanc (CSS grayscale)
- Trace coloree en SVG overlay (projection Web Mercator)
- Polyline simplifiee calculee a l'import (Ramer-Douglas-Peucker, 50-100 points)
- Superposition multi-traces pour les aventures

### Navigation
- Header reorganise : "Journal" en lien principal, "Mes traces" et "Mes bateaux" dans le dropdown utilisateur
- Redirection accueil vers `/journal` (au lieu de `/traces`)

### Schema
- Nouveaux modeles : Dossier, Aventure, Navigation (avec TypeNavigation enum)
- Champ `polylineSimplifiee` sur Trace

### API
- `GET/POST /api/journal/dossiers` — liste et creation de dossiers
- `PATCH/DELETE /api/journal/dossiers/[id]` — modification et suppression
- `GET /api/journal/dossiers/[id]/contenu` — contenu deplie
- `POST /api/journal/dossiers/[dossierId]/aventures` — creation aventure
- `PATCH/DELETE /api/journal/aventures/[id]` — modification et suppression
- `POST /api/journal/navigations` — creation navigation
- `PATCH/DELETE /api/journal/navigations/[id]` — modification et suppression

---
```

- [ ] **Step 4: Verifier que le build passe**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/page.tsx ROADMAP.md CHANGELOG.md
rtk git commit -m "$(cat <<'EOF'
docs: mise a jour roadmap (split Phase 3 en 3a/3b/3c) + changelog v0.4.0
EOF
)"
```

---

## Task 14 : Verification finale

- [ ] **Step 1: Build complet**

Run: `rtk npm run build`
Expected: build sans erreur

- [ ] **Step 2: Test fonctionnel complet**

Run: `npm run dev`

Tester le parcours complet :
1. Se connecter → redirige vers `/journal`
2. Creer un dossier "Saison 2026"
3. Deployer le dossier → creer une aventure "Tour de Corse"
4. Creer une navigation dans l'aventure (avec trace liee)
5. Survoler la navigation → panneau d'apercu avec mini-carte et stats
6. Survoler l'aventure → panneau avec traces superposees
7. Creer une navigation orpheline (sans aventure) dans le dossier
8. Tester les filtres (bateau, type)
9. Modifier/supprimer un element
10. Verifier le dropdown utilisateur (Mes traces, Mes bateaux)
11. Naviguer vers `/traces` et `/bateaux` via le dropdown

- [ ] **Step 3: Commit final si ajustements**

```bash
rtk git add -A
rtk git commit -m "$(cat <<'EOF'
fix: ajustements Phase 3a apres test fonctionnel
EOF
)"
```
