-- CreateEnum
CREATE TYPE "DocumentSubjectRelevance" AS ENUM ('UNSET', 'IMPORTANT', 'NOT_IMPORTANT');

-- AlterTable
ALTER TABLE "document_studies" ADD COLUMN "subject_relevance" "DocumentSubjectRelevance" NOT NULL DEFAULT 'UNSET';
