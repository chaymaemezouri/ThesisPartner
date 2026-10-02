-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('ARTICLE', 'THESIS_CHAPTER', 'REPORT', 'CODE', 'DATASET', 'PRESENTATION', 'POSTER', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'VALIDATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "deliverables" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "objective_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "type" "DeliverableType" NOT NULL,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" DATE,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliverables_thesis_id_status_idx" ON "deliverables"("thesis_id", "status");

-- CreateIndex
CREATE INDEX "deliverables_thesis_id_type_idx" ON "deliverables"("thesis_id", "type");

-- CreateIndex
CREATE INDEX "deliverables_objective_id_idx" ON "deliverables"("objective_id");

-- CreateIndex
CREATE INDEX "deliverables_due_date_idx" ON "deliverables"("due_date");

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
