-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ObjectivePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "objectives" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "ObjectivePriority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" DATE,
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "responsible_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objectives_thesis_id_status_idx" ON "objectives"("thesis_id", "status");

-- CreateIndex
CREATE INDEX "objectives_thesis_id_due_date_idx" ON "objectives"("thesis_id", "due_date");

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
