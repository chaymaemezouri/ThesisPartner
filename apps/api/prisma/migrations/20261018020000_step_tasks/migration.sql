-- Work items under an existing objective step. Steps, files and remarks already stored stay in place.
CREATE TYPE "StepTaskStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'VALIDATED', 'REJECTED');

CREATE TABLE "step_tasks" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "status" "StepTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "review_message" VARCHAR(500),
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "step_tasks_task_id_position_idx" ON "step_tasks"("task_id", "position");
CREATE INDEX "step_tasks_task_id_status_idx" ON "step_tasks"("task_id", "status");

ALTER TABLE "step_tasks" ADD CONSTRAINT "step_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "step_tasks" ADD CONSTRAINT "step_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "step_tasks" ADD CONSTRAINT "step_tasks_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deliverables" ADD COLUMN "step_task_id" UUID;
CREATE UNIQUE INDEX "deliverables_step_task_id_key" ON "deliverables"("step_task_id");
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_step_task_id_fkey" FOREIGN KEY ("step_task_id") REFERENCES "step_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "remarks" ADD COLUMN "step_task_id" UUID;
CREATE INDEX "remarks_step_task_id_idx" ON "remarks"("step_task_id");
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_step_task_id_fkey" FOREIGN KEY ("step_task_id") REFERENCES "step_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
