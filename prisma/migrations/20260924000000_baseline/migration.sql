-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AgentMessageKind" AS ENUM ('TEXT', 'PHOTO_RESULTS');

-- CreateEnum
CREATE TYPE "AgentMessageStatus" AS ENUM ('COMPLETED', 'INTERRUPTED', 'ERROR');

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "thumbSmallKey" TEXT NOT NULL,
    "thumbLargeKey" TEXT NOT NULL,
    "videoKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dominantColor" TEXT,
    "top" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_exifs" (
    "id" SERIAL NOT NULL,
    "photoId" INTEGER NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "lensModel" TEXT,
    "fNumber" DOUBLE PRECISION,
    "exposureTime" TEXT,
    "iso" INTEGER,
    "focalLength" DOUBLE PRECISION,
    "exposureBias" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "colorSpace" TEXT,
    "exposureMode" TEXT,
    "exposureProgram" TEXT,
    "flash" TEXT,
    "focalLengthIn35mmFormat" DOUBLE PRECISION,
    "gpsTimeStamp" TEXT,
    "lensMake" TEXT,
    "meteringMode" TEXT,
    "rawData" JSONB,
    "software" TEXT,
    "whiteBalance" TEXT,
    "exifImageHeight" INTEGER,
    "exifImageWidth" INTEGER,
    "GPSLatitude" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "GPSLatitudeRef" TEXT,
    "GPSLongitude" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "GPSLongitudeRef" TEXT,
    "bearingDirection" TEXT,
    "gpsImgDirection" DOUBLE PRECISION,

    CONSTRAINT "photo_exifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "photoId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "GPSLatitude" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "GPSLongitude" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "altitude" DOUBLE PRECISION,
    "bearing" DOUBLE PRECISION,
    "bearingDirection" TEXT,
    "township" TEXT,
    "adcode" TEXT,
    "formattedAddress" TEXT,
    "neighborhood" TEXT,
    "type" TEXT,
    "rawData" JSONB,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "adcode" TEXT NOT NULL,
    "country" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("adcode")
);

-- CreateTable
CREATE TABLE "photo_ai_analyses" (
    "id" SERIAL NOT NULL,
    "photo_id" INTEGER NOT NULL,
    "theme" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "embedding" vector(1024),
    "tag_embedding" vector(1024),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "kind" "AgentMessageKind" NOT NULL DEFAULT 'TEXT',
    "status" "AgentMessageStatus" NOT NULL DEFAULT 'COMPLETED',
    "content" TEXT NOT NULL,
    "photo_total" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_message_photos" (
    "message_id" TEXT NOT NULL,
    "photo_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "agent_message_photos_pkey" PRIMARY KEY ("message_id","photo_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_originalPath_key" ON "photos"("originalPath");

-- CreateIndex
CREATE UNIQUE INDEX "photo_exifs_photoId_key" ON "photo_exifs"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_photoId_key" ON "locations"("photoId");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_adcode_idx" ON "locations"("adcode");

-- CreateIndex
CREATE INDEX "regions_province_city_district_idx" ON "regions"("province", "city", "district");

-- CreateIndex
CREATE UNIQUE INDEX "photo_ai_analyses_photo_id_key" ON "photo_ai_analyses"("photo_id");

-- CreateIndex
CREATE INDEX "agent_conversations_visitor_id_updated_at_idx" ON "agent_conversations"("visitor_id", "updated_at");

-- CreateIndex
CREATE INDEX "agent_messages_conversation_id_sequence_idx" ON "agent_messages"("conversation_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "agent_messages_conversation_id_sequence_key" ON "agent_messages"("conversation_id", "sequence");

-- CreateIndex
CREATE INDEX "agent_message_photos_photo_id_idx" ON "agent_message_photos"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_message_photos_message_id_position_key" ON "agent_message_photos"("message_id", "position");

-- AddForeignKey
ALTER TABLE "photo_exifs" ADD CONSTRAINT "photo_exifs_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_adcode_fkey" FOREIGN KEY ("adcode") REFERENCES "regions"("adcode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_ai_analyses" ADD CONSTRAINT "photo_ai_analyses_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_message_photos" ADD CONSTRAINT "agent_message_photos_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "agent_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_message_photos" ADD CONSTRAINT "agent_message_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

