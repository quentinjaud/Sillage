-- CreateTable
CREATE TABLE "CelluleMeteo" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "ventVitesseKn" DOUBLE PRECISION NOT NULL,
    "ventRafalesKn" DOUBLE PRECISION NOT NULL,
    "ventDirectionDeg" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'open-meteo-archive',
    "resolution" TEXT NOT NULL DEFAULT '25km/1h',

    CONSTRAINT "CelluleMeteo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CelluleMeteo_traceId_idx" ON "CelluleMeteo"("traceId");

-- CreateIndex
CREATE UNIQUE INDEX "CelluleMeteo_traceId_latitude_longitude_dateDebut_key" ON "CelluleMeteo"("traceId", "latitude", "longitude", "dateDebut");

-- AddForeignKey
ALTER TABLE "CelluleMeteo" ADD CONSTRAINT "CelluleMeteo_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
