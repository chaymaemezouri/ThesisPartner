CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "thesis_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "scheduled_on" DATE NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meetings_thesis_id_scheduled_on_idx" ON "meetings"("thesis_id", "scheduled_on");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
