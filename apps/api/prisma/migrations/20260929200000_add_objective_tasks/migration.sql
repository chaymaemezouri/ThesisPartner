-- CreateEnum
CREATE TYPE "ObjectiveReviewStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "objectives" ADD COLUMN "manual_progress" INTEGER NOT NULL DEFAULT 0;
UPDATE "objectives" SET "manual_progress" = "progress";
ALTER TABLE "objectives" ADD COLUMN "review_status" "ObjectiveReviewStatus" NOT NULL DEFAULT 'NOT_REQUESTED';
ALTER TABLE "objectives" ADD COLUMN "completion_requested_at" TIMESTAMP(3);
ALTER TABLE "objectives" ADD COLUMN "completion_requested_by_id" UUID;
ALTER TABLE "objectives" ADD COLUMN "validated_at" TIMESTAMP(3);
ALTER TABLE "objectives" ADD COLUMN "validated_by_id" UUID;
ALTER TABLE "objectives" ADD COLUMN "review_message" VARCHAR(500);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "due_date" DATE,
    "position" INTEGER NOT NULL,
    "created_by_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_objective_id_position_idx" ON "tasks"("objective_id", "position");

-- CreateIndex
CREATE INDEX "tasks_objective_id_status_idx" ON "tasks"("objective_id", "status");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_completion_requested_by_id_fkey" FOREIGN KEY ("completion_requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
