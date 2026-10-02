-- CreateEnum
CREATE TYPE "ContributionOrigin" AS ENUM ('STANDARD_TEMPLATE', 'DOCTORAL_STUDENT', 'SUPERVISOR');

-- AlterTable
ALTER TABLE "objectives" ADD COLUMN "origin" "ContributionOrigin" NOT NULL DEFAULT 'DOCTORAL_STUDENT';
ALTER TABLE "objectives" ADD COLUMN "template_code" VARCHAR(40);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "origin" "ContributionOrigin" NOT NULL DEFAULT 'DOCTORAL_STUDENT';

-- CreateTable
CREATE TABLE "objective_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),

    CONSTRAINT "objective_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "objective_templates_code_key" ON "objective_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "objective_templates_position_key" ON "objective_templates"("position");

-- CreateIndex
CREATE UNIQUE INDEX "task_templates_template_id_position_key" ON "task_templates"("template_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "objectives_thesis_id_template_code_key" ON "objectives"("thesis_id", "template_code");

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "objective_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
