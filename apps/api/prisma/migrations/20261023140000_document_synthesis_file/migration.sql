-- AlterTable
ALTER TABLE "document_studies" ADD COLUMN "synthesis_file_key" VARCHAR(500),
ADD COLUMN "synthesis_file_name" VARCHAR(180),
ADD COLUMN "synthesis_file_mime" VARCHAR(160);
