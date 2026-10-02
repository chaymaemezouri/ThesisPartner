-- CreateEnum
CREATE TYPE "RemarkStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RemarkPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "remarks" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(4000) NOT NULL,
    "status" "RemarkStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "RemarkPriority" NOT NULL DEFAULT 'MEDIUM',
    "objective_id" UUID,
    "task_id" UUID,
    "deliverable_id" UUID,
    "deliverable_version_id" UUID,
    "correction_version_id" UUID,
    "location" VARCHAR(300),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remark_replies" (
    "id" UUID NOT NULL,
    "remark_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "message" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remark_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remarks_thesis_id_status_idx" ON "remarks"("thesis_id", "status");

-- CreateIndex
CREATE INDEX "remarks_thesis_id_priority_idx" ON "remarks"("thesis_id", "priority");

-- CreateIndex
CREATE INDEX "remarks_thesis_id_updated_at_idx" ON "remarks"("thesis_id", "updated_at");

-- CreateIndex
CREATE INDEX "remarks_objective_id_idx" ON "remarks"("objective_id");

-- CreateIndex
CREATE INDEX "remarks_deliverable_id_idx" ON "remarks"("deliverable_id");

-- CreateIndex
CREATE INDEX "remark_replies_remark_id_created_at_idx" ON "remark_replies"("remark_id", "created_at");

-- V1: at most one SUPERVISOR membership per thesis
CREATE UNIQUE INDEX "thesis_memberships_one_supervisor_per_thesis"
ON "thesis_memberships" ("thesis_id")
WHERE "role" = 'SUPERVISOR';

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_deliverable_version_id_fkey" FOREIGN KEY ("deliverable_version_id") REFERENCES "deliverable_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_correction_version_id_fkey" FOREIGN KEY ("correction_version_id") REFERENCES "deliverable_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remark_replies" ADD CONSTRAINT "remark_replies_remark_id_fkey" FOREIGN KEY ("remark_id") REFERENCES "remarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remark_replies" ADD CONSTRAINT "remark_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
