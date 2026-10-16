-- Existing objectives, tasks and history stay. New columns default to year 1.
ALTER TABLE "profiles" ADD COLUMN "doctoral_year" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "theses" ADD COLUMN "doctoral_year" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "objectives" ADD COLUMN "doctoral_year" INTEGER NOT NULL DEFAULT 1;

-- Place the original doctoral path on the year it belongs to, without rewriting titles or tasks.
UPDATE "objectives"
SET "doctoral_year" = 2
WHERE "template_code" IN ('EXPERIMENTATION', 'ANALYSE', 'PUBLICATION');

UPDATE "objectives"
SET "doctoral_year" = 3
WHERE "template_code" IN ('REDACTION', 'SOUTENANCE');

CREATE INDEX "objectives_thesis_id_doctoral_year_idx" ON "objectives"("thesis_id", "doctoral_year");
