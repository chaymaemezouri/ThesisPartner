CREATE TYPE "SharedResourceKind" AS ENUM ('COURSE', 'ARTICLE', 'DOCUMENT');

CREATE TABLE "shared_resources" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "kind" "SharedResourceKind" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "source" VARCHAR(200),
    "summary" VARCHAR(2000),
    "url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shared_resources_author_id_created_at_idx" ON "shared_resources"("author_id", "created_at");

ALTER TABLE "shared_resources" ADD CONSTRAINT "shared_resources_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
