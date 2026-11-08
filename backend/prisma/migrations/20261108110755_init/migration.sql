-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "Verified" BOOLEAN DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Park" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "mobility_data" VARCHAR,
    "maintenance_stats" VARCHAR,
    "location" geography NOT NULL,
    "osm_type" VARCHAR(16),
    "osm_id" BIGINT,

    CONSTRAINT "Park_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkAmenity" (
    "id" SERIAL NOT NULL,
    "park_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "location" geometry,
    "osm_type" VARCHAR(16),
    "osm_id" BIGINT,

    CONSTRAINT "ParkAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "description" VARCHAR NOT NULL,
    "image" BYTEA,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" geography NOT NULL,
    "heading" TEXT,
    "park_id" INTEGER,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "park_id" INTEGER NOT NULL,
    "content" VARCHAR NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trails" (
    "id" SERIAL NOT NULL,
    "park_id" INTEGER,
    "osm_id" BIGINT,
    "highway" VARCHAR(50),
    "name" VARCHAR(255),
    "surface" VARCHAR(50),
    "geom" geometry,

    CONSTRAINT "trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimePasswords" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT DEFAULT 'NULL',
    "active" BOOLEAN DEFAULT false,
    "email" TEXT,

    CONSTRAINT "One Time Passwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Park_location_idx" ON "Park" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "Park_osm_type_osm_id_key" ON "Park"("osm_type", "osm_id");

-- CreateIndex
CREATE INDEX "ParkAmenity_location_idx" ON "ParkAmenity" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "ParkAmenity_osm_type_osm_id_key" ON "ParkAmenity"("osm_type", "osm_id");

-- CreateIndex
CREATE INDEX "SafetyReport_location_idx" ON "SafetyReport" USING GIST ("location");

-- CreateIndex
CREATE INDEX "trails_geom_idx" ON "trails" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "trails_park_id_osm_id_key" ON "trails"("park_id", "osm_id");

-- AddForeignKey
ALTER TABLE "ParkAmenity" ADD CONSTRAINT "ParkAmenity_park_id_fkey" FOREIGN KEY ("park_id") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_park_id_fkey" FOREIGN KEY ("park_id") REFERENCES "Park"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_park_id_fkey" FOREIGN KEY ("park_id") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_park_id_fkey" FOREIGN KEY ("park_id") REFERENCES "Park"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
