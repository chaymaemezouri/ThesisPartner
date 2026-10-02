-- AlterTable
ALTER TABLE "profiles"
ADD COLUMN "academic_title" VARCHAR(80),
ADD COLUMN "doctoral_school" VARCHAR(200),
ADD COLUMN "specialty" VARCHAR(160),
ADD COLUMN "city" VARCHAR(80),
ADD COLUMN "country" VARCHAR(80),
ADD COLUMN "avatar_url" VARCHAR(500),
ADD COLUMN "google_scholar_url" VARCHAR(500),
ADD COLUMN "linkedin_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "theses"
ADD COLUMN "discipline" VARCHAR(160),
ADD COLUMN "institution" VARCHAR(200),
ADD COLUMN "started_on" DATE,
ADD COLUMN "expected_defense_on" DATE;
