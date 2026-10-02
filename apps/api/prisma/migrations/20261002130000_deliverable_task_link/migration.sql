-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN "task_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "deliverables_task_id_key" ON "deliverables"("task_id");

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
