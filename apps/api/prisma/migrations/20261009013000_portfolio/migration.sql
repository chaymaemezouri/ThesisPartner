CREATE TYPE "PublicationKind" AS ENUM ('ARTICLE', 'CONFERENCE');

CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "venue" VARCHAR(200) NOT NULL,
    "year" INTEGER NOT NULL,
    "kind" "PublicationKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_skills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_skills_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publications_user_id_year_idx" ON "publications"("user_id", "year");
CREATE INDEX "portfolio_projects_user_id_idx" ON "portfolio_projects"("user_id");
CREATE UNIQUE INDEX "portfolio_skills_user_id_label_key" ON "portfolio_skills"("user_id", "label");

ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_skills" ADD CONSTRAINT "portfolio_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
