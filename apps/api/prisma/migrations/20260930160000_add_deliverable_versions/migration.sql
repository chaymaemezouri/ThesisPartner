-- CreateTable
CREATE TABLE "deliverable_versions" (
    "id" UUID NOT NULL,
    "deliverable_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "change_summary" VARCHAR(1000),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverable_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliverable_versions_deliverable_id_version_number_key" ON "deliverable_versions"("deliverable_id", "version_number");

-- CreateIndex
CREATE INDEX "deliverable_versions_deliverable_id_created_at_idx" ON "deliverable_versions"("deliverable_id", "created_at");

-- AddForeignKey
ALTER TABLE "deliverable_versions" ADD CONSTRAINT "deliverable_versions_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable_versions" ADD CONSTRAINT "deliverable_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
