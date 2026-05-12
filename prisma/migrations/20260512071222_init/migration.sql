-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

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
    "country" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "township" TEXT,
    "adcode" TEXT,
    "formattedAddress" TEXT,
    "neighborhood" TEXT,
    "type" TEXT,
    "rawData" JSONB,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalKey" TEXT,
    "thumbSmallKey" TEXT,
    "thumbLargeKey" TEXT,
    "videoKey" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dominantColor" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "top" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_ai_analyses" (
    "id" SERIAL NOT NULL,
    "photoId" INTEGER NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "embedding" vector(768),
    "location" geography(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photo_exifs_photoId_key" ON "photo_exifs"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_photoId_key" ON "locations"("photoId");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "photos_originalPath_key" ON "photos"("originalPath");

-- CreateIndex
CREATE UNIQUE INDEX "photo_ai_analyses_photoId_key" ON "photo_ai_analyses"("photoId");

-- AddForeignKey
ALTER TABLE "photo_exifs" ADD CONSTRAINT "photo_exifs_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_ai_analyses" ADD CONSTRAINT "photo_ai_analyses_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
