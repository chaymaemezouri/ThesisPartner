-- Documents a supervisor recommends for one thesis, plus the student's reading and synthesis.
CREATE TYPE "ThesisDocumentKind" AS ENUM ('ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'REPORT', 'REFERENCE', 'LINK');
CREATE TYPE "DocumentImportance" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'ESSENTIAL');
CREATE TYPE "DocumentPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "DocumentAccess" AS ENUM ('SHARED', 'PROTECTED');
CREATE TYPE "DocumentFollowUp" AS ENUM ('TO_READ', 'READ', 'SYNTHESIS_DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'VALIDATED');

CREATE TABLE "thesis_documents" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "objective_id" UUID,
    "task_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "kind" "ThesisDocumentKind" NOT NULL,
    "authors" VARCHAR(300),
    "reference" VARCHAR(500),
    "url" VARCHAR(500),
    "file_key" VARCHAR(500),
    "file_name" VARCHAR(180),
    "file_mime" VARCHAR(160),
    "importance" "DocumentImportance" NOT NULL DEFAULT 'MEDIUM',
    "priority" "DocumentPriority" NOT NULL DEFAULT 'NORMAL',
    "access" "DocumentAccess" NOT NULL DEFAULT 'SHARED',
    "due_date" DATE,
    "instructions" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thesis_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_studies" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "DocumentFollowUp" NOT NULL DEFAULT 'TO_READ',
    "consulted_at" TIMESTAMP(3),
    "summary" VARCHAR(4000),
    "methodology" VARCHAR(4000),
    "results" VARCHAR(4000),
    "limits" VARCHAR(4000),
    "thesis_link" VARCHAR(4000),
    "exploitation" VARCHAR(4000),
    "review_message" VARCHAR(500),
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_studies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_studies_document_id_key" ON "document_studies"("document_id");
CREATE INDEX "document_studies_status_idx" ON "document_studies"("status");
CREATE INDEX "thesis_documents_thesis_id_priority_idx" ON "thesis_documents"("thesis_id", "priority");
CREATE INDEX "thesis_documents_thesis_id_kind_idx" ON "thesis_documents"("thesis_id", "kind");

ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_studies" ADD CONSTRAINT "document_studies_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "thesis_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_studies" ADD CONSTRAINT "document_studies_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_studies" ADD CONSTRAINT "document_studies_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
