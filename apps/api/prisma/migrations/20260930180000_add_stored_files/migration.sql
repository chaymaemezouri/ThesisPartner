-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "deliverable_version_id" UUID NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(180) NOT NULL,
    "mime_type" VARCHAR(160) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" CHAR(64) NOT NULL,
    "scan_status" "FileScanStatus" NOT NULL,
    "storage_provider" VARCHAR(32) NOT NULL DEFAULT 's3',
    "uploaded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_deliverable_version_id_key" ON "stored_files"("deliverable_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_deliverable_version_id_fkey" FOREIGN KEY ("deliverable_version_id") REFERENCES "deliverable_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
