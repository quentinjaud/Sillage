-- CreateEnum
CREATE TYPE "TypeNavigation" AS ENUM ('SOLO', 'REGATE');

-- AlterTable
ALTER TABLE "Trace" ADD COLUMN     "polylineSimplifiee" JSONB;

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aventure" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aventure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Navigation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TypeNavigation" NOT NULL DEFAULT 'SOLO',
    "userId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "aventureId" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Navigation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dossier_userId_idx" ON "Dossier"("userId");

-- CreateIndex
CREATE INDEX "Aventure_dossierId_idx" ON "Aventure"("dossierId");

-- CreateIndex
CREATE INDEX "Aventure_userId_idx" ON "Aventure"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Navigation_traceId_key" ON "Navigation"("traceId");

-- CreateIndex
CREATE INDEX "Navigation_dossierId_idx" ON "Navigation"("dossierId");

-- CreateIndex
CREATE INDEX "Navigation_aventureId_idx" ON "Navigation"("aventureId");

-- CreateIndex
CREATE INDEX "Navigation_userId_idx" ON "Navigation"("userId");

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aventure" ADD CONSTRAINT "Aventure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aventure" ADD CONSTRAINT "Aventure_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Navigation" ADD CONSTRAINT "Navigation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Navigation" ADD CONSTRAINT "Navigation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Navigation" ADD CONSTRAINT "Navigation_aventureId_fkey" FOREIGN KEY ("aventureId") REFERENCES "Aventure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Navigation" ADD CONSTRAINT "Navigation_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
