-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN "review_message" VARCHAR(500),
ADD COLUMN "submitted_at" TIMESTAMP(3),
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_id" UUID;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
