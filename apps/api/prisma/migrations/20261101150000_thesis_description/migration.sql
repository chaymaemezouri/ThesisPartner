-- Thesis abstract / short description shown on profile, dashboard and supervisor views.
ALTER TABLE "theses" ADD COLUMN IF NOT EXISTS "description" VARCHAR(4000);
