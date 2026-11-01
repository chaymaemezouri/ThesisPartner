-- Remove interactive onboarding / startup guide preference columns.
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "onboarding_welcome_dismissed_at";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "onboarding_guide_completed_at";
