CREATE TYPE "PublicationStatus" AS ENUM ('IN_PREPARATION', 'SUBMITTED', 'ACCEPTED', 'PUBLISHED');

ALTER TABLE "publications" ADD COLUMN "status" "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED';

CREATE TABLE "periodic_evaluations" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "evaluated_on" DATE NOT NULL,
    "quality" INTEGER NOT NULL,
    "autonomy" INTEGER NOT NULL,
    "methodology" INTEGER NOT NULL,
    "advancement" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodic_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "periodic_evaluations_thesis_id_evaluated_on_idx" ON "periodic_evaluations"("thesis_id", "evaluated_on");

ALTER TABLE "periodic_evaluations" ADD CONSTRAINT "periodic_evaluations_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "periodic_evaluations" ADD CONSTRAINT "periodic_evaluations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
